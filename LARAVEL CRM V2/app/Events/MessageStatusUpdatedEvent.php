<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Broadcasts synchronously (not queued) — a single Meta webhook call can carry
 * dozens of batched delivery-status updates, each firing this; queuing them put
 * that whole burst on the same database-backed queue as webhook/campaign jobs. */
class MessageStatusUpdatedEvent implements ShouldBroadcastNow
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

    /** Without this, Laravel broadcasts the FQCN as the wire event name, which never matches
     * the frontend's `.MessageStatusUpdatedEvent` listener. */
    public function broadcastAs(): string
    {
        return 'MessageStatusUpdatedEvent';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'status' => $this->message->status,
        ];
    }
}
