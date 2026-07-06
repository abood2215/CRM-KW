<?php

namespace App\Services\Tasks;

use App\Models\Notification;
use App\Models\Task;
use App\Services\Notifications\NotificationService;

class ReminderService
{
    /** Notifies each task's owner once per day while it's due today or overdue and still pending. */
    public function sendDueReminders(): int
    {
        $tasks = Task::where('status', 'pending')
            ->whereDate('due_date', '<=', today())
            ->whereNotNull('user_id')
            ->get();

        $sent = 0;

        foreach ($tasks as $task) {
            $alreadySentToday = Notification::where('user_id', $task->user_id)
                ->where('type', 'task_reminder')
                ->whereDate('created_at', today())
                ->whereJsonContains('data->task_id', $task->id)
                ->exists();

            if ($alreadySentToday) {
                continue;
            }

            $isOverdue = $task->due_date->lt(today());

            NotificationService::send(
                $task->user_id,
                'task_reminder',
                $isOverdue ? 'مهمة متأخرة' : 'مهمة مستحقة اليوم',
                "\"{$task->title}\" ".($isOverdue ? 'تجاوزت موعدها.' : 'موعدها اليوم.'),
                ['task_id' => $task->id],
            );

            $sent++;
        }

        return $sent;
    }
}
