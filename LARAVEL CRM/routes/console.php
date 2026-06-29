<?php

use Illuminate\Support\Facades\Schedule;
use App\Jobs\ProcessCampaignJob;
use App\Models\Campaign;

/*
|--------------------------------------------------------------------------
| Console Routes - Scheduled Jobs
|--------------------------------------------------------------------------
*/

// Reset WhatsApp daily sending limits at midnight
Schedule::job(new \App\Jobs\ResetDailyLimitJob)->daily()->at('00:00');

// تحويل المحادثات المفتوحة إلى "معلقة" بعد انتهاء نافذة الـ 24 ساعة لواتساب
Schedule::job(new \App\Jobs\ExpireConversationsJob)->everyThirtyMinutes()->withoutOverlapping();

// مزامنة قوالب واتساب كل 6 ساعات
Schedule::job(new \App\Jobs\SyncTemplatesJob)->everySixHours();

// تشغيل الحملات المجدولة التي حان وقتها — كل دقيقة
// هذا fallback أساسي: يضمن تشغيل أي حملة حان وقتها حتى لو كان الـ queue worker متوقفاً لحظة الجدولة
Schedule::call(function () {
    Campaign::where('status', 'scheduled')
        ->where('scheduled_at', '<=', now())
        ->each(function (Campaign $campaign) {
            $campaign->update(['status' => 'running', 'started_at' => $campaign->started_at ?? now()]);
            ProcessCampaignJob::dispatch($campaign->id);
            \Illuminate\Support\Facades\Log::info("[Scheduler] بدأت الحملة #{$campaign->id} \"{$campaign->name}\" تلقائياً");
        });
})->everyMinute()->name('launch-scheduled-campaigns')->withoutOverlapping();
