<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Conversation $conversation
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('conversations'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->conversation->id,
            'status' => $this->conversation->status,
            'assigned_user_id' => $this->conversation->assigned_user_id,
            'last_message' => $this->conversation->last_message,
            'last_message_at' => $this->conversation->last_message_at?->toISOString(),
            'unread_count' => $this->conversation->unread_count,
        ];
    }
}
