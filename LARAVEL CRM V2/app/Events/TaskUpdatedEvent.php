<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Public signal-only event — the frontend just refetches its task list on receipt, no payload needed beyond identifying the task. */
class TaskUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $taskId)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('tasks')];
    }

    public function broadcastWith(): array
    {
        return ['id' => $this->taskId];
    }
}
