<?php

namespace App\Jobs;

use App\Models\Conversation;
use App\Models\Message;
use App\Events\NewMessageEvent;
use App\Events\ConversationUpdatedEvent;
use App\Services\ChatwootService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class UpdateConversationFromChatwoot implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected array $webhookData
    ) {}

    public function handle(ChatwootService $chatwoot): void
    {
        $event = $this->webhookData['event'] ?? null;

        match ($event) {
            'message_created' => $this->handleMessageCreated(),
            'conversation_status_changed' => $this->handleConversationStatusChanged(),
            'conversation_created' => $this->handleConversationCreated(),
            default => Log::info("Unhandled Chatwoot webhook event: {$event}"),
        };
    }

    protected function handleMessageCreated(): void
    {
        $data = $this->webhookData;
        $chatwootConvId = $data['conversation']['id'] ?? null;

        if (!$chatwootConvId) return;

        $conversation = Conversation::where('chatwoot_conv_id', $chatwootConvId)->first();

        if (!$conversation) {
            $conversation = Conversation::create([
                'chatwoot_conv_id' => $chatwootConvId,
                'status' => 'open',
                'source' => $data['conversation']['channel'] ?? 'whatsapp',
            ]);
        }

        $messageData = $data['content'] ?? '';
        $messageType = $data['content_type'] ?? 'text';
        $direction = ($data['message_type'] ?? '') === 'incoming' ? 'in' : 'out';

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'chatwoot_message_id' => $data['id'] ?? null,
            'content' => $messageData,
            'type' => in_array($messageType, ['text', 'image', 'file']) ? $messageType : 'text',
            'direction' => $direction,
            'is_private' => $data['private'] ?? false,
            'sender_name' => $data['sender']['name'] ?? null,
            'sent_at' => now(),
        ]);

        $conversation->update([
            'last_message' => $messageData,
            'last_message_at' => now(),
            'unread_count' => $direction === 'in'
                ? $conversation->unread_count + 1
                : $conversation->unread_count,
        ]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));
    }

    protected function handleConversationStatusChanged(): void
    {
        $data = $this->webhookData;
        $chatwootConvId = $data['id'] ?? null;

        if (!$chatwootConvId) return;

        $conversation = Conversation::where('chatwoot_conv_id', $chatwootConvId)->first();

        if ($conversation) {
            $status = $data['status'] ?? 'open';
            $conversation->update(['status' => $status]);
            event(new ConversationUpdatedEvent($conversation->fresh()));
        }
    }

    protected function handleConversationCreated(): void
    {
        $data = $this->webhookData;
        $chatwootConvId = $data['id'] ?? null;

        if (!$chatwootConvId) return;

        Conversation::firstOrCreate(
            ['chatwoot_conv_id' => $chatwootConvId],
            [
                'status' => $data['status'] ?? 'open',
                'source' => $data['channel'] ?? 'whatsapp',
            ]
        );
    }
}
