<?php

namespace App\Console\Commands;

use App\Models\WhatsappNumber;
use App\Services\Notifications\NotificationService;
use App\Services\Whatsapp\CloudApiWhatsAppSender;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Polls Meta's quality_rating for every connected Cloud API number and alerts
 * admins the moment it drops — this is exactly the blind spot that silently
 * throttled/broke the old app (a LOW rating discovered only via a screenshot
 * from Meta Business Manager, well after campaigns had started failing).
 */
class CheckWhatsappHealth extends Command
{
    protected $signature = 'whatsapp:check-health';

    protected $description = 'Check Meta quality_rating for connected Cloud API numbers and alert on degradation';

    private const RANK = ['GREEN' => 0, 'YELLOW' => 1, 'RED' => 2, 'UNKNOWN' => 1];

    public function handle(): int
    {
        $numbers = WhatsappNumber::where('api_type', 'cloud')
            ->where('status', 'connected')
            ->whereNotNull('access_token')
            ->whereNotNull('phone_number_id')
            ->get();

        foreach ($numbers as $number) {
            $this->checkOne($number);
        }

        $this->info("فُحص {$numbers->count()} رقم.");

        return self::SUCCESS;
    }

    private function checkOne(WhatsappNumber $number): void
    {
        $sender = new CloudApiWhatsAppSender($number->access_token, $number->phone_number_id);
        $result = $sender->getPhoneNumberStatus();

        $newRating = $result['quality_rating'] ?? null;
        if (! $newRating) {
            return;
        }

        $oldRating = $number->quality_rating;
        $number->update(['quality_rating' => $newRating, 'quality_checked_at' => now()]);

        $degraded = $oldRating
            && (self::RANK[$newRating] ?? 1) > (self::RANK[$oldRating] ?? 0);
        $isBad = in_array($newRating, ['YELLOW', 'RED'], true);

        if (! $degraded && ! ($isBad && ! $oldRating)) {
            return;
        }

        $label = ['GREEN' => 'جيدة', 'YELLOW' => 'متوسطة', 'RED' => 'ضعيفة'][$newRating] ?? $newRating;

        Log::warning("[whatsapp:check-health] جودة الرقم {$number->phone} تغيّرت", [
            'from' => $oldRating, 'to' => $newRating,
        ]);

        NotificationService::sendToAdmins(
            'whatsapp_quality_degraded',
            'تنبيه: جودة رقم واتساب',
            "جودة الرقم \"{$number->name}\" ({$number->phone}) أصبحت {$label}. رقم بجودة ضعيفة يعني Meta قد تُقيّد أو توقف الإرسال منه.",
            ['whatsapp_number_id' => $number->id, 'quality_rating' => $newRating],
        );
    }
}
