<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Broadcasts synchronously (not queued) — queuing this put it on the same
 * database-backed queue as webhook/campaign jobs, and a burst of these
 * (e.g. after a mass campaign) could starve that queue for minutes. */
class NewMessageEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('conversations.'.$this->message->conversation_id),
            new Channel('conversations'),
        ];
    }

    /** Without this, Laravel broadcasts the FQCN (App\Events\NewMessageEvent) as the wire event
     * name instead of this bare string, which never matches the frontend's `.NewMessageEvent` listener. */
    public function broadcastAs(): string
    {
        return 'NewMessageEvent';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'content' => $this->message->content,
            'type' => $this->message->type,
            'direction' => $this->message->direction,
            'is_private' => $this->message->is_private,
            'sender_name' => $this->message->sender_name,
            'status' => $this->message->status,
            'sent_at' => $this->message->sent_at?->toISOString(),
            'created_at' => $this->message->created_at?->toISOString(),
        ];
    }
}
