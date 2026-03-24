<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Events\NewMessageEvent;
use App\Events\ConversationUpdatedEvent;
use App\Services\ChatwootService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function __construct(
        protected ChatwootService $chatwoot
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Conversation::with(['client', 'assignedUser'])->withCount('messages');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('assigned_user_id')) {
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

    public function show(int $id): JsonResponse
    {
        $conversation = Conversation::with(['client', 'assignedUser'])
            ->withCount('messages')
            ->findOrFail($id);

        // Reset unread count
        $conversation->update(['unread_count' => 0]);

        return response()->json([
            'conversation' => new ConversationResource($conversation),
        ]);
    }

    public function messages(Request $request, int $id): JsonResponse
    {
        $conversation = Conversation::findOrFail($id);

        $messages = $conversation->messages()
            ->orderBy('sent_at', 'desc')
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
            'content' => 'required|string',
            'type' => 'sometimes|in:text,image,file',
        ]);

        $conversation = Conversation::findOrFail($id);

        // Send via Chatwoot if connected
        if ($conversation->chatwoot_conv_id) {
            $this->chatwoot->sendMessage(
                $conversation->chatwoot_conv_id,
                $request->content
            );
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'content' => $request->content,
            'type' => $request->type ?? 'text',
            'direction' => 'out',
            'is_private' => false,
            'sender_name' => $request->user()->name,
            'sent_at' => now(),
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

        $conversation = Conversation::findOrFail($id);

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

    public function addNote(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'content' => 'required|string',
        ]);

        $conversation = Conversation::findOrFail($id);

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
