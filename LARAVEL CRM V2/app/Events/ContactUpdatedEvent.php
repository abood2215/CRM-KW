<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Public signal-only event — covers both edits and pipeline-stage moves, since both go through the same update endpoint. */
class ContactUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $contactId)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('contacts')];
    }

    /** Without this, Laravel broadcasts the FQCN as the wire event name, which never matches
     * the frontend's `.ContactUpdatedEvent` listener. */
    public function broadcastAs(): string
    {
        return 'ContactUpdatedEvent';
    }

    public function broadcastWith(): array
    {
        return ['id' => $this->contactId];
    }
}
