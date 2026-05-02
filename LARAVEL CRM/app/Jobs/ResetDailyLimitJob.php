<?php

namespace App\Jobs;

use App\Models\WhatsappNumber;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ResetDailyLimitJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        // 1. تصفير عدد الرسائل المرسلة اليوم لجميع الأرقام
        WhatsappNumber::query()->update(['sent_today' => 0]);

        // 2. تحديث رقم الأسبوع لكل رقم بناءً على عمره
        // الأسبوع 1 (0-6 أيام):  حد يومي 250 رسالة
        // الأسبوع 2 (7-13 يوم):  حد يومي 500 رسالة
        // الأسبوع 3+ (14+ يوم):  حد يومي 1000 رسالة
        $dailyLimitMap = [1 => 250, 2 => 500, 3 => 1000];

        WhatsappNumber::all()->each(function (WhatsappNumber $number) use ($dailyLimitMap) {
            $daysSinceCreated = (int) $number->created_at->diffInDays(now());
            $calculatedWeek   = min(3, (int) floor($daysSinceCreated / 7) + 1);

            $updates = [];

            if ($calculatedWeek > $number->week_number) {
                $updates['week_number']  = $calculatedWeek;
                $updates['daily_limit']  = $dailyLimitMap[$calculatedWeek];
                Log::info("WhatsApp رقم #{$number->id} ({$number->phone}) ارتقى إلى الأسبوع {$calculatedWeek} — حد يومي جديد: {$dailyLimitMap[$calculatedWeek]}");
            }

            if (!empty($updates)) {
                $number->update($updates);
            }
        });
    }
}
