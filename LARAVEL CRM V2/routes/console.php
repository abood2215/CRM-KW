<?php

use App\Jobs\ExpireConversationsJob;
use App\Jobs\ProcessCampaignJob;
use App\Jobs\ResetDailyLimitJob;
use App\Jobs\SendTaskRemindersJob;
use App\Jobs\SyncTemplatesJob;
use App\Models\Campaign;
use App\Models\Contact;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new ResetDailyLimitJob)->daily()->at('00:00')->withoutOverlapping();

Schedule::job(new ExpireConversationsJob)->everyThirtyMinutes()->withoutOverlapping();

Schedule::job(new SyncTemplatesJob)->everySixHours()->withoutOverlapping();

Schedule::job(new SendTaskRemindersJob)->dailyAt('08:00')->withoutOverlapping();

Schedule::command('backup:run')->dailyAt('03:00')->withoutOverlapping();

Schedule::command('whatsapp:check-health')->hourly()->withoutOverlapping();

// Clears temporary blacklists once their expiry has passed.
Schedule::call(function () {
    $count = Contact::whereNotNull('blacklisted_until')
        ->where('blacklisted_until', '<=', now())
        ->update(['blacklisted_until' => null, 'is_blacklisted' => false]);

    if ($count > 0) {
        Log::info("[Scheduler] فُكَّ الحظر المؤقت عن {$count} جهة اتصال");
    }
})->hourly()->name('auto-unblock-contacts')->withoutOverlapping();

// Fallback launcher: guarantees a scheduled campaign starts even if the queue
// worker was down at the exact scheduled_at moment.
Schedule::call(function () {
    Campaign::where('status', 'scheduled')
        ->where('scheduled_at', '<=', now())
        ->each(function (Campaign $campaign) {
            $campaign->update(['status' => 'running', 'started_at' => $campaign->started_at ?? now()]);
            ProcessCampaignJob::dispatch($campaign->id);
            Log::info("[Scheduler] بدأت الحملة #{$campaign->id} \"{$campaign->name}\" تلقائياً");
        });
})->everyMinute()->name('launch-scheduled-campaigns')->withoutOverlapping();
