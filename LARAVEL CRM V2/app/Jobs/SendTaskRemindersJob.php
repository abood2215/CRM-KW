<?php

namespace App\Jobs;

use App\Services\Tasks\ReminderService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendTaskRemindersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(ReminderService $reminders): void
    {
        $sent = $reminders->sendDueReminders();

        if ($sent > 0) {
            Log::info("[SendTaskReminders] أُرسل {$sent} تذكير مهمة");
        }
    }
}
