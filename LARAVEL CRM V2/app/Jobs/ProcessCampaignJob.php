<?php

namespace App\Jobs;

use App\Events\CampaignProgressEvent;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;
use App\Services\Campaigns\CampaignService;
use App\Services\Conversations\BlacklistPolicyService;
use App\Services\Conversations\CampaignConversationSync;
use App\Services\Notifications\NotificationService;
use App\Services\Whatsapp\Contracts\WhatsAppSenderInterface;
use App\Services\Whatsapp\WhatsAppSenderFactory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Each execution handles one recipient only — no sleep() blocking workers.
    public int $timeout = 120;

    public int $tries = 2;

    public function __construct(protected int $campaignId)
    {
    }

    public function handle(
        CampaignService $service,
        CampaignConversationSync $conversationSync,
        BlacklistPolicyService $blacklistPolicy,
    ): void {
        $campaign = Campaign::find($this->campaignId);

        if (! $campaign || in_array($campaign->status, ['paused', 'completed', 'cancelled'])) {
            return;
        }

        $number = WhatsappNumber::find($campaign->whatsapp_number_id)
            ?? WhatsappNumber::where('status', 'connected')->first();

        if (! $number) {
            Log::error("[Campaign #{$campaign->id}] لا يوجد رقم واتساب صالح");
            $this->pause($campaign, "الحملة \"{$campaign->name}\" موقوفة: لا يوجد رقم واتساب متصل.");

            return;
        }

        if (! $number->canSend()) {
            Log::warning("[Campaign #{$campaign->id}] الرقم {$number->phone} غير متصل");
            $this->pause($campaign, "الحملة \"{$campaign->name}\" موقوفة: الرقم {$number->phone} غير متصل بالواتساب.");

            return;
        }

        $recipient = DB::transaction(function () use ($campaign) {
            $r = $campaign->recipients()->where('status', 'pending')->lockForUpdate()->first();
            if ($r) {
                $r->update(['status' => 'processing']);
            }

            return $r;
        });

        if (! $recipient) {
            if ($campaign->recipients()->where('status', 'processing')->exists()) {
                return;
            }
            $campaign->update(['status' => 'completed', 'completed_at' => now()]);
            Log::info("[Campaign #{$campaign->id}] اكتملت — أُرسلت: {$campaign->sent_count} | فشلت: {$campaign->failed_count}");
            NotificationService::sendToAdmins(
                'campaign_completed',
                'اكتملت الحملة',
                "الحملة \"{$campaign->name}\" اكتملت. أُرسلت: {$campaign->sent_count} | فشلت: {$campaign->failed_count}",
                ['campaign_id' => $campaign->id],
            );

            return;
        }

        if ($campaign->status !== 'running') {
            $campaign->update(['status' => 'running', 'started_at' => $campaign->started_at ?? now()]);
        }

        try {
            $sender = WhatsAppSenderFactory::make($number);
            $result = $this->sendToRecipient($sender, $campaign, $recipient);

            $waMessageId = $result['messages'][0]['id'] ?? null;

            $recipient->update([
                'status' => 'sent',
                'sent_at' => now(),
                'whatsapp_message_id' => $waMessageId,
            ]);

            $campaign->increment('sent_count');
            $number->incrementSent();

            if ($recipient->contact) {
                $sentContent = $campaign->message_text ?: "حملة: {$campaign->name}";
                $conversationSync->recordSend($recipient->contact, $campaign, $sentContent, $waMessageId);
            }

            Log::info("[Campaign #{$campaign->id}] أُرسلت لـ {$recipient->phone_snapshot}", ['wamid' => $waMessageId]);
        } catch (\Exception $e) {
            $this->handleSendFailure($campaign, $recipient, $e->getMessage(), $blacklistPolicy);
        }

        event(new CampaignProgressEvent($campaign->fresh()));

        if ($service->checkFailRate($campaign)) {
            $campaign->update(['status' => 'paused']);
            Log::warning("[Campaign #{$campaign->id}] أُوقفت تلقائياً: تجاوز معدل الفشل المسموح");

            return;
        }

        $delay = $service->calculateDelay($campaign);
        self::dispatch($this->campaignId)->delay(now()->addSeconds($delay));
    }

    private function handleSendFailure(Campaign $campaign, CampaignRecipient $recipient, string $errorMsg, BlacklistPolicyService $blacklistPolicy): void
    {
        Log::error("[Campaign #{$campaign->id}] فشل الإرسال لـ {$recipient->phone_snapshot}: {$errorMsg}");

        if ($recipient->contact) {
            $isPermanentBlock = $blacklistPolicy->isPermanentBlock(null, $errorMsg);
            $blacklistPolicy->applyFailure($recipient->contact, $isPermanentBlock);
        }

        $recipient->update([
            'status' => 'failed',
            'error_message' => $errorMsg,
            'sent_at' => now(),
        ]);
        $campaign->increment('failed_count');
    }

    private function pause(Campaign $campaign, string $reason): void
    {
        $campaign->recipients()->where('status', 'processing')->update(['status' => 'pending']);
        $campaign->update(['status' => 'paused']);
        Log::warning("[Campaign #{$campaign->id}] paused: {$reason}");
        NotificationService::sendToAdmins('campaign_paused', 'الحملة موقوفة', $reason, ['campaign_id' => $campaign->id]);
    }

    private function sendToRecipient(WhatsAppSenderInterface $sender, Campaign $campaign, CampaignRecipient $recipient): array
    {
        $phone = $recipient->phone_snapshot;

        if ($campaign->template_name) {
            return $sender->sendTemplate(
                $phone,
                $campaign->template_name,
                $campaign->template_language ?? 'ar',
                $this->buildTemplateComponents($campaign, $recipient),
            );
        }

        if ($campaign->image_path) {
            return $sender->sendImage($phone, $campaign->image_path, $campaign->message_text);
        }

        return $sender->sendMessage($phone, $campaign->message_text);
    }

    private function buildTemplateComponents(Campaign $campaign, CampaignRecipient $recipient): array
    {
        $components = [];

        $localTemplate = WhatsappTemplate::where('name', $campaign->template_name)->first();
        $imageUrl = $campaign->image_path ?: $localTemplate?->header_content;

        if ($localTemplate && $localTemplate->header_type === 'image' && $imageUrl) {
            $components[] = [
                'type' => 'header',
                'parameters' => [['type' => 'image', 'image' => ['link' => $imageUrl]]],
            ];
        }

        $vars = $recipient->variables ?? $campaign->template_variables ?? [];
        if (! empty($vars)) {
            $resolved = array_map(
                fn ($v) => is_string($v) ? str_replace('{{name}}', $recipient->name_snapshot ?? $recipient->phone_snapshot, $v) : $v,
                $vars
            );
            $components[] = [
                'type' => 'body',
                'parameters' => array_map(fn ($v) => ['type' => 'text', 'text' => (string) $v], $resolved),
            ];
        }

        return $components;
    }
}
