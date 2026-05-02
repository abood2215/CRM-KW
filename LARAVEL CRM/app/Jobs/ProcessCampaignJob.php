<?php

namespace App\Jobs;

use App\Events\CampaignProgressEvent;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\WhatsappNumber;
use App\Services\CampaignService;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Each execution handles one recipient only — no sleep() blocking workers
    public int $timeout = 120;
    public int $tries   = 2;

    public function __construct(
        protected int $campaignId
    ) {}

    public function handle(CampaignService $service): void
    {
        $campaign = Campaign::find($this->campaignId);

        if (!$campaign || in_array($campaign->status, ['paused', 'completed', 'cancelled'])) {
            return;
        }

        // Resolve the WhatsApp number assigned to this campaign
        $number = WhatsappNumber::find($campaign->whatsapp_number_id)
            ?? WhatsappNumber::whereNotNull('phone_number_id')->where('status', 'connected')->first();

        if (!$number || !$number->access_token || !$number->phone_number_id) {
            Log::error("[Campaign #{$campaign->id}] لا يوجد رقم WhatsApp صالح");
            $this->pauseWithNotification(
                $campaign,
                'فشل تشغيل الحملة',
                "الحملة \"{$campaign->name}\" موقوفة: لا يوجد رقم واتساب متصل."
            );
            return;
        }

        if (!$number->canSend()) {
            Log::warning("[Campaign #{$campaign->id}] وصل الرقم {$number->phone} للحد اليومي");
            $this->pauseWithNotification(
                $campaign,
                'تم الوصول للحد اليومي',
                "الحملة \"{$campaign->name}\" موقوفة مؤقتاً: الرقم {$number->phone} وصل لحده اليومي ({$number->daily_limit})."
            );
            return;
        }

        if ($service->checkFailRate($campaign)) {
            Log::warning("[Campaign #{$campaign->id}] معدل الفشل تجاوز {$campaign->stop_on_fail_rate}%");
            $this->pauseWithNotification(
                $campaign,
                'معدل فشل مرتفع',
                "الحملة \"{$campaign->name}\" موقوفة تلقائياً: معدل الفشل تجاوز {$campaign->stop_on_fail_rate}%."
            );
            return;
        }

        // Get next pending recipient
        $recipient = $campaign->recipients()->where('status', 'pending')->first();

        if (!$recipient) {
            $campaign->update(['status' => 'completed', 'completed_at' => now()]);
            event(new CampaignProgressEvent($campaign->fresh()));
            NotificationService::sendToAdmins(
                'campaign_completed',
                'اكتملت الحملة',
                "الحملة \"{$campaign->name}\" اكتملت. أُرسلت: {$campaign->sent_count} | فشلت: {$campaign->failed_count}",
                ['campaign_id' => $campaign->id]
            );
            return;
        }

        // Mark running on first execution
        if ($campaign->status !== 'running') {
            $campaign->update(['status' => 'running', 'started_at' => $campaign->started_at ?? now()]);
        }

        $whatsapp = new WhatsAppService($number->access_token, $number->phone_number_id);

        try {
            $result = $this->sendToRecipient($whatsapp, $campaign, $recipient, $number->phone_number_id);

            $waMessageId = $result['messages'][0]['id'] ?? null;

            $recipient->update([
                'status'              => 'sent',
                'sent_at'             => now(),
                'whatsapp_message_id' => $waMessageId,
            ]);

            $campaign->increment('sent_count');
            $number->incrementSent();

            Log::info("[Campaign #{$campaign->id}] أُرسلت لـ {$recipient->phone}", ['wamid' => $waMessageId]);

        } catch (\Exception $e) {
            $recipient->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            $campaign->increment('failed_count');
            Log::error("[Campaign #{$campaign->id}] فشل الإرسال لـ {$recipient->phone}: {$e->getMessage()}");
        }

        // Broadcast live progress to frontend
        event(new CampaignProgressEvent($campaign->fresh()));

        // Re-dispatch for the next recipient after the configured delay
        $delay = $service->calculateDelay($campaign);
        self::dispatch($this->campaignId)->delay(now()->addSeconds($delay));
    }

    private function sendToRecipient(
        WhatsAppService $whatsapp,
        Campaign $campaign,
        CampaignRecipient $recipient,
        string $phoneNumberId
    ): array {
        if ($campaign->template_name) {
            return $whatsapp->sendTemplate(
                $recipient->phone,
                $campaign->template_name,
                $campaign->template_language ?? 'ar',
                $this->buildTemplateComponents($campaign, $recipient),
                $phoneNumberId
            );
        }

        if ($campaign->image_path) {
            return $whatsapp->sendImage(
                $recipient->phone,
                $campaign->image_path,
                $campaign->message_text,
                $phoneNumberId
            );
        }

        return $whatsapp->sendMessage(
            $recipient->phone,
            $campaign->message_text,
            $phoneNumberId
        );
    }

    private function buildTemplateComponents(Campaign $campaign, CampaignRecipient $recipient): array
    {
        $vars = $recipient->variables ?? $campaign->template_variables ?? [];

        if (empty($vars)) {
            return [];
        }

        // Replace {{name}} with recipient's actual name
        $resolved = array_map(
            fn($v) => is_string($v) ? str_replace('{{name}}', $recipient->name ?? $recipient->phone, $v) : $v,
            $vars
        );

        return [[
            'type'       => 'body',
            'parameters' => array_map(fn($v) => ['type' => 'text', 'text' => (string) $v], $resolved),
        ]];
    }

    private function pauseWithNotification(Campaign $campaign, string $title, string $body): void
    {
        $campaign->update(['status' => 'paused']);
        NotificationService::sendToAdmins(
            'campaign_paused',
            $title,
            $body,
            ['campaign_id' => $campaign->id]
        );
    }
}
