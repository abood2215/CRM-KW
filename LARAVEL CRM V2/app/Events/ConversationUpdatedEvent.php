<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Broadcasts synchronously (not queued) — queuing this put it on the same
 * database-backed queue as webhook/campaign jobs, and a burst of these
 * (e.g. many conversations expiring in one scheduler tick) could starve that queue. */
class ConversationUpdatedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Conversation $conversation)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('conversations')];
    }

    /** Without this, Laravel broadcasts the FQCN as the wire event name, which never matches
     * the frontend's `.ConversationUpdatedEvent` listener. */
    public function broadcastAs(): string
    {
        return 'ConversationUpdatedEvent';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->conversation->id,
            'status' => $this->conversation->status,
            'assigned_user_id' => $this->conversation->assigned_user_id,
            'is_campaign_origin' => $this->conversation->is_campaign_origin,
            'last_message' => $this->conversation->last_message,
            'last_message_at' => $this->conversation->last_message_at?->toISOString(),
            'unread_count' => $this->conversation->unread_count,
        ];
    }
}
