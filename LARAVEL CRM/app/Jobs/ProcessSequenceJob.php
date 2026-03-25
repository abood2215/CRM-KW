<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\CampaignSequence;
use App\Models\WhatsappNumber;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

// يتابع سلاسل الرسائل (Sequences) - يرسل الرسالة التالية بعد delay_days
class ProcessSequenceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 300;

    public function __construct(
        protected int $campaignId,
        protected int $stepNumber,
        protected int $recipientId
    ) {}

    public function handle(): void
    {
        $campaign   = Campaign::find($this->campaignId);
        $recipient  = CampaignRecipient::find($this->recipientId);

        if (!$campaign || !$recipient || $campaign->status === 'paused') {
            return;
        }

        $sequence = CampaignSequence::where('campaign_id', $this->campaignId)
            ->where('step_number', $this->stepNumber)
            ->where('status', 'active')
            ->first();

        if (!$sequence) {
            Log::info("ProcessSequenceJob: لا يوجد خطوة رقم {$this->stepNumber} للحملة {$this->campaignId}");
            return;
        }

        $number = WhatsappNumber::find($campaign->whatsapp_number_id);

        if (!$number || !$number->access_token || !$number->phone_number_id) {
            Log::error("ProcessSequenceJob: لا يوجد رقم WhatsApp للحملة {$this->campaignId}");
            return;
        }

        try {
            $whatsapp = new WhatsAppService(
                $number->access_token,
                $number->phone_number_id
            );

            // إرسال رسالة القالب
            $variables = $recipient->variables ?? [];

            $whatsapp->sendTemplate(
                $recipient->phone,
                $sequence->template_name,
                $campaign->template_language ?? 'ar',
                $variables
            );

            Log::info("ProcessSequenceJob: أُرسلت الخطوة {$this->stepNumber} للمستلم {$recipient->phone}");

            // هل توجد خطوة تالية؟
            $nextStep = CampaignSequence::where('campaign_id', $this->campaignId)
                ->where('step_number', $this->stepNumber + 1)
                ->where('status', 'active')
                ->first();

            if ($nextStep) {
                // جدول الخطوة التالية بعد delay_days أيام
                self::dispatch($this->campaignId, $nextStep->step_number, $this->recipientId)
                    ->delay(now()->addDays($nextStep->delay_days));
            }

        } catch (\Exception $e) {
            Log::error("ProcessSequenceJob فشل: " . $e->getMessage());
        }
    }
}
