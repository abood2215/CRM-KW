<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ConversationUpdatedEvent;
use App\Events\NewMessageEvent;
use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;
use App\Policies\ConversationPolicy;
use App\Services\ChatwootService;
use App\Services\Whatsapp\WhatsAppSenderFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MessageController extends Controller
{
    public function __construct(private readonly ChatwootService $chatwoot)
    {
    }

    public function index(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        // A message that never actually reached the customer (async delivery failure) shouldn't
        // appear in the thread — it would mislead the agent into thinking it was delivered.
        $messages = $conversation->messages()
            ->where(fn ($q) => $q->whereNull('status')->orWhere('status', '!=', 'failed'))
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

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $request->validate([
            'content' => 'required|string',
            'type' => 'sometimes|in:text,image,file',
            'is_private' => 'sometimes|boolean',
        ]);

        $conversation->load('contact');
        $waMessageId = null;

        if ($conversation->chatwoot_conv_id) {
            $this->chatwoot->sendMessage($conversation->chatwoot_conv_id, $request->content);
        }

        if (! $conversation->chatwoot_conv_id && $conversation->source === 'whatsapp') {
            $contactPhone = $conversation->contact?->phone;

            if (! $contactPhone && ! $request->boolean('is_private', false)) {
                return response()->json(['message' => 'لا يوجد رقم هاتف مرتبط بهذه المحادثة.'], 422);
            }

            if ($contactPhone) {
                $number = WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();

                if ($number) {
                    try {
                        $sender = WhatsAppSenderFactory::make($number);
                        $result = $request->type === 'image'
                            ? $sender->sendImage($contactPhone, $request->content)
                            : $sender->sendMessage($contactPhone, $request->content);
                        $waMessageId = $result['messages'][0]['id'] ?? null;
                        $number->incrementSent();
                    } catch (\Exception $e) {
                        Log::error('[MessageController] send failed', ['conversation_id' => $conversation->id, 'error' => $e->getMessage()]);
                    }
                }
            }
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'whatsapp_message_id' => $waMessageId,
            'content' => $request->content,
            'type' => $request->type ?? 'text',
            'direction' => 'out',
            'is_private' => $request->boolean('is_private', false),
            'sender_name' => $request->user()->name,
            'status' => $waMessageId ? 'sent' : null,
            'sent_at' => now(),
        ]);

        $conversation->update(['last_message' => $request->content, 'last_message_at' => now(), 'unread_count' => 0]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json(['message' => new MessageResource($message)], 201);
    }

    public function sendTemplate(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $request->validate([
            'template_id' => 'required|exists:whatsapp_templates,id',
            'variables' => 'nullable|array',
        ]);

        $conversation->load('contact');
        $template = WhatsappTemplate::findOrFail($request->template_id);

        if ($template->status !== 'approved') {
            return response()->json(['message' => 'القالب غير معتمد من Meta.'], 422);
        }

        $contactPhone = $conversation->contact?->phone;
        if (! $contactPhone) {
            return response()->json(['message' => 'لا يوجد رقم هاتف للعميل.'], 422);
        }

        $number = WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();
        if (! $number) {
            return response()->json(['message' => 'لا يوجد رقم واتساب متصل.'], 422);
        }

        $variables = $request->variables ?? [];
        $sentBody = $template->body_text;
        foreach ($variables as $i => $val) {
            $sentBody = str_replace('{{'.($i + 1).'}}', $val, $sentBody);
        }

        $waMessageId = null;
        try {
            $sender = WhatsAppSenderFactory::make($number);
            // Plain sendMessage so local body_text edits are always reflected.
            $result = $sender->sendMessage($contactPhone, $sentBody);
            $waMessageId = $result['messages'][0]['id'] ?? null;
            $number->incrementSent();
        } catch (\Exception $e) {
            return response()->json(['message' => 'فشل إرسال القالب: '.$e->getMessage()], 500);
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'whatsapp_message_id' => $waMessageId,
            'content' => $sentBody,
            'type' => 'text',
            'direction' => 'out',
            'is_private' => false,
            'sender_name' => $request->user()->name,
            'status' => $waMessageId ? 'sent' : null,
            'sent_at' => now(),
        ]);

        $conversation->update(['last_message' => $sentBody, 'last_message_at' => now(), 'unread_count' => 0]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        return response()->json(['message' => new MessageResource($message)], 201);
    }

    public function addNote(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $request->validate(['content' => 'required|string']);

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

        return response()->json(['message' => new MessageResource($message)], 201);
    }
}
