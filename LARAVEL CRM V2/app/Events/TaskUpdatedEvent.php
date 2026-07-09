<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Public signal-only event — the frontend just refetches its task list on receipt, no payload needed beyond identifying the task.
 * Broadcasts synchronously (not queued) to avoid competing with webhook/campaign jobs on the shared database queue. */
class TaskUpdatedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $taskId)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('tasks')];
    }

    /** Without this, Laravel broadcasts the FQCN as the wire event name, which never matches
     * the frontend's `.TaskUpdatedEvent` listener. */
    public function broadcastAs(): string
    {
        return 'TaskUpdatedEvent';
    }

    public function broadcastWith(): array
    {
        return ['id' => $this->taskId];
    }
}
