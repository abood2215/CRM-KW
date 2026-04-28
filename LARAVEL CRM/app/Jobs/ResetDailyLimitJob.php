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
        WhatsappNumber::all()->each(function (WhatsappNumber $number) {
            // حساب عدد الأيام منذ إنشاء الرقم
            $daysSinceCreated = (int) $number->created_at->diffInDays(now());

            // تحديد رقم الأسبوع (بحد أقصى 3)
            $calculatedWeek = min(3, (int) floor($daysSinceCreated / 7) + 1);

            // نحدّث فقط إذا ارتفع رقم الأسبوع (لا نرجع للخلف)
            if ($calculatedWeek > $number->week_number) {
                $number->update(['week_number' => $calculatedWeek]);

                Log::info("WhatsApp رقم #{$number->id} ({$number->phone}) ارتقى إلى الأسبوع {$calculatedWeek}");
            }
        });
    }
}
