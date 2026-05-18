<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\CrmClient;
use App\Models\Message;
use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;
use App\Events\NewMessageEvent;
use App\Events\ConversationUpdatedEvent;
use App\Services\ChatwootService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ConversationController extends Controller
{
    public function __construct(
        protected ChatwootService $chatwoot,
        protected WhatsAppService $whatsapp
    ) {}

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'phone'             => 'required|string',
            'name'              => 'nullable|string|max:255',
            'message'           => 'required|string',
            'template_name'     => 'nullable|string',
            'template_language' => 'nullable|string',
        ]);

        $phone = $request->phone;

        // Find existing client by phone or create new one
        $client = CrmClient::where('phone', $phone)->first();
        if (!$client) {
            $client = CrmClient::create([
                'phone'   => $phone,
                'name'    => $request->name ?: $phone,
                'source'  => 'whatsapp',
                'status'  => 'new',
                'user_id' => $request->user()->id,
            ]);
        }

        // Reuse existing open conversation or create new one
        $conversation = Conversation::where('client_id', $client->id)
            ->where('status', 'open')
            ->where('source', 'whatsapp')
            ->first();

        if (!$conversation) {
            $conversation = Conversation::create([
                'client_id'       => $client->id,
                'source'          => 'whatsapp',
                'status'          => 'open',
                'last_message_at' => now(),
            ]);
        }

        // Send via WhatsApp Cloud API
        $waMessageId = null;
        $whatsappNumber = WhatsappNumber::whereNotNull('phone_number_id')
            ->where('status', 'connected')
            ->first();

        if ($whatsappNumber) {
            try {
                $waService = new WhatsAppService(
                    $whatsappNumber->access_token,
                    $whatsappNumber->phone_number_id
                );
                if ($request->template_name) {
                    $result = $waService->sendTemplate(
                        $phone,
                        $request->template_name,
                        $request->template_language ?? 'ar'
                    );
                } else {
                    $result = $waService->sendMessage($phone, $request->message);
                }
                $waMessageId = $result['messages'][0]['id'] ?? null;
                $whatsappNumber->incrementSent();
            } catch (\Exception $e) {
                Log::error('[ConversationController] store - WhatsApp send failed', [
                    'phone' => $phone,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $message = Message::create([
            'conversation_id'     => $conversation->id,
            'whatsapp_message_id' => $waMessageId,
            'content'             => $request->message,
            'type'                => 'text',
            'direction'           => 'out',
            'is_private'          => false,
            'sender_name'         => $request->user()->name,
            'status'              => $waMessageId ? 'sent' : null,
            'sent_at'             => now(),
        ]);

        $conversation->update([
            'last_message'    => $request->message,
            'last_message_at' => now(),
        ]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json([
            'conversation' => new ConversationResource($conversation->fresh()->load(['client', 'assignedUser'])),
            'message'      => new MessageResource($message),
        ], 201);
    }

    private function agentConversationScope($query, $user): void
    {
        if ($user->role === 'agent') {
            $query->where(function ($q) use ($user) {
                $q->where('assigned_user_id', $user->id)
                  ->orWhereNull('assigned_user_id');
            });
        }
    }

    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = Conversation::with(['client', 'assignedUser'])->withCount('messages');

        $this->agentConversationScope($query, $user);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($user->role !== 'agent' && $request->has('assigned_user_id')) {
            $query->where('assigned_user_id', $request->assigned_user_id);
        }

        if ($request->has('source')) {
            $query->where('source', $request->source);
        }

        $conversations = $query->orderBy('last_message_at', 'desc')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'conversations' => ConversationResource::collection($conversations),
            'meta' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user  = $request->user();
        $query = Conversation::with(['client', 'assignedUser'])->withCount('messages');

        $this->agentConversationScope($query, $user);

        $conversation = $query->findOrFail($id);
        $conversation->update(['unread_count' => 0]);

        return response()->json([
            'conversation' => new ConversationResource($conversation),
        ]);
    }

    public function messages(Request $request, int $id): JsonResponse
    {
        $user  = $request->user();
        $query = Conversation::query();

        $this->agentConversationScope($query, $user);

        $conversation = $query->findOrFail($id);

        $messages = $conversation->messages()
            ->orderBy('sent_at', 'asc')
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'messages' => MessageResource::collection($messages),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
            ],
        ]);
    }

    public function sendMessage(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'content'    => 'required|string',
            'type'       => 'sometimes|in:text,image,file',
            'is_private' => 'sometimes|boolean',
        ]);

        $user  = $request->user();
        $query = Conversation::with('client');

        $this->agentConversationScope($query, $user);

        $conversation = $query->findOrFail($id);

        $waMessageId = null;

        // Send via Chatwoot if connected
        if ($conversation->chatwoot_conv_id) {
            $this->chatwoot->sendMessage(
                $conversation->chatwoot_conv_id,
                $request->content
            );
        }

        // Send directly via WhatsApp Cloud API for native WhatsApp conversations
        if (!$conversation->chatwoot_conv_id && $conversation->source === 'whatsapp') {
            $clientPhone = $conversation->client?->phone ?? null;

            if ($clientPhone) {
                $whatsappNumber = WhatsappNumber::whereNotNull('phone_number_id')
                    ->where('status', 'connected')
                    ->first();

                if ($whatsappNumber) {
                    try {
                        $type = $request->type ?? 'text';
                        $waService = new WhatsAppService(
                            $whatsappNumber->access_token,
                            $whatsappNumber->phone_number_id
                        );

                        if ($type === 'image' && $request->content) {
                            $result = $waService->sendImage($clientPhone, $request->content);
                        } else {
                            $result = $waService->sendMessage($clientPhone, $request->content);
                        }

                        $waMessageId = $result['messages'][0]['id'] ?? null;
                        $whatsappNumber->incrementSent();

                    } catch (\Exception $e) {
                        Log::error('[ConversationController] WhatsApp send failed', [
                            'conversation_id' => $id,
                            'error'           => $e->getMessage(),
                        ]);
                    }
                }
            }
        }

        $message = Message::create([
            'conversation_id'    => $conversation->id,
            'whatsapp_message_id'=> $waMessageId,
            'content'            => $request->content,
            'type'               => $request->type ?? 'text',
            'direction'          => 'out',
            'is_private'         => $request->boolean('is_private', false),
            'sender_name'        => $request->user()->name,
            'status'             => $waMessageId ? 'sent' : null,
            'sent_at'            => now(),
        ]);

        $conversation->update([
            'last_message' => $request->content,
            'last_message_at' => now(),
        ]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json([
            'message' => new MessageResource($message),
        ], 201);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:open,resolved,pending',
        ]);

        $user  = $request->user();
        $query = Conversation::query();

        $this->agentConversationScope($query, $user);

        $conversation = $query->findOrFail($id);

        if ($conversation->chatwoot_conv_id) {
            $this->chatwoot->toggleStatus($conversation->chatwoot_conv_id, $request->status);
        }

        $conversation->update(['status' => $request->status]);
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json([
            'conversation' => new ConversationResource($conversation->fresh()->load(['client', 'assignedUser'])),
            'message' => 'تم تحديث حالة المحادثة.',
        ]);
    }

    public function assign(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'user_id' => 'nullable|exists:users,id',
        ]);

        $conversation = Conversation::findOrFail($id);

        if ($conversation->chatwoot_conv_id && $request->user_id) {
            $this->chatwoot->assignConversation($conversation->chatwoot_conv_id, $request->user_id);
        }

        $conversation->update(['assigned_user_id' => $request->user_id]);
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json([
            'conversation' => new ConversationResource($conversation->fresh()->load(['client', 'assignedUser'])),
            'message' => 'تم تعيين المحادثة.',
        ]);
    }

    public function sendTemplateMessage(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'template_id' => 'required|exists:whatsapp_templates,id',
            'variables'   => 'nullable|array',
        ]);

        $user  = $request->user();
        $query = Conversation::with('client');
        $this->agentConversationScope($query, $user);
        $conversation = $query->findOrFail($id);

        $template = WhatsappTemplate::findOrFail($request->template_id);

        if ($template->status !== 'approved') {
            return response()->json(['message' => 'القالب غير معتمد من Meta.'], 422);
        }

        $clientPhone = $conversation->client?->phone ?? null;
        if (!$clientPhone) {
            return response()->json(['message' => 'لا يوجد رقم هاتف للعميل.'], 422);
        }

        $whatsappNumber = WhatsappNumber::whereNotNull('phone_number_id')
            ->where('status', 'connected')
            ->first();

        if (!$whatsappNumber) {
            return response()->json(['message' => 'لا يوجد رقم واتساب متصل.'], 422);
        }

        // Build components with variables
        $components = [];
        $variables  = $request->variables ?? [];
        if (!empty($variables)) {
            $params = array_map(fn($v) => ['type' => 'text', 'text' => (string) $v], array_values($variables));
            $components[] = ['type' => 'body', 'parameters' => $params];
        }

        $waMessageId = null;
        try {
            $waService = new WhatsAppService($whatsappNumber->access_token, $whatsappNumber->phone_number_id);
            $result    = $waService->sendTemplate($clientPhone, $template->name, $template->language, $components);
            $waMessageId = $result['messages'][0]['id'] ?? null;
            $whatsappNumber->incrementSent();
        } catch (\Exception $e) {
            Log::error('[ConversationController] sendTemplate failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'فشل إرسال القالب: ' . $e->getMessage()], 500);
        }

        // Build preview of the sent message
        $sentBody = $template->body_text;
        foreach ($variables as $i => $val) {
            $sentBody = str_replace('{{' . ($i + 1) . '}}', $val, $sentBody);
        }

        $message = Message::create([
            'conversation_id'     => $conversation->id,
            'whatsapp_message_id' => $waMessageId,
            'content'             => $sentBody,
            'type'                => 'text',
            'direction'           => 'out',
            'is_private'          => false,
            'sender_name'         => $request->user()->name,
            'status'              => $waMessageId ? 'sent' : null,
            'sent_at'             => now(),
        ]);

        $conversation->update([
            'last_message'    => $sentBody,
            'last_message_at' => now(),
        ]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json(['message' => new MessageResource($message)], 201);
    }

    public function addNote(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'content' => 'required|string',
        ]);

        $user  = $request->user();
        $query = Conversation::query();

        $this->agentConversationScope($query, $user);

        $conversation = $query->findOrFail($id);

        if ($conversation->chatwoot_conv_id) {
            $this->chatwoot->sendMessage($conversation->chatwoot_conv_id, $request->content, true);
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'content' => $request->content,
            'type' => 'text',
            'direction' => 'out',
            'is_private' => true,
            'sender_name' => $request->user()->name,
            'sent_at' => now(),
        ]);

        return response()->json([
            'message' => new MessageResource($message),
        ], 201);
    }
}
