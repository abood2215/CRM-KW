<?php

namespace App\Jobs;

use App\Events\CampaignProgressEvent;
use App\Events\NewMessageEvent;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\CrmClient;
use App\Models\Message;
use App\Models\WhatsappNumber;
use App\Services\CampaignService;
use App\Services\NotificationService;
use App\Services\WhatsAppService;
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

        // Get next pending recipient (locked inside transaction to prevent race conditions)
        $recipient = \DB::transaction(function () use ($campaign) {
            $r = $campaign->recipients()->where('status', 'pending')->lockForUpdate()->first();
            if ($r) {
                $r->update(['status' => 'processing']);
            }
            return $r;
        });

        if (!$recipient) {
            // Only mark complete if nothing is still being processed by another job
            if ($campaign->recipients()->where('status', 'processing')->exists()) {
                return;
            }
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

            // المحادثة تُنشأ فقط عند تأكيد التوصيل عبر webhook (delivered)
            // حتى لا تظهر محادثات في صندوق الرسائل للأرقام التي تفشل لاحقاً

            Log::info("[Campaign #{$campaign->id}] أُرسلت لـ {$recipient->phone}", ['wamid' => $waMessageId]);

        } catch (\Exception $e) {
            Log::error("[Campaign #{$campaign->id}] فشل الإرسال لـ {$recipient->phone}: {$e->getMessage()}");

            try {
                // حظر الرقم ومسحه من قاعدة البيانات
                $normalizedPhone = $this->normalizePhone($recipient->phone);
                Contact::updateOrCreate(
                    ['phone' => $normalizedPhone],
                    ['is_blacklisted' => true, 'name' => $recipient->name ?? $normalizedPhone]
                );
                CrmClient::where('phone', $normalizedPhone)->update(['phone' => null]);

                // حذف السجل نهائياً — لا يُعدّ ولا يظهر في الإحصائيات
                $recipient->delete();
                $campaign->decrement('total_recipients');
            } catch (\Exception $cleanupEx) {
                // إذا فشلت عملية الحذف/الحظر، نسجله كـ failed حتى يظهر ويُعالج يدوياً
                Log::error("[Campaign #{$campaign->id}] فشل تنظيف الرقم {$recipient->phone}: {$cleanupEx->getMessage()}");
                $recipient->update([
                    'status'        => 'failed',
                    'error_message' => $e->getMessage(),
                    'sent_at'       => now(),
                ]);
                $campaign->increment('failed_count');
            }
        }

        // Broadcast live progress to frontend
        event(new CampaignProgressEvent($campaign->fresh()));

        // Re-dispatch for the next recipient after the configured delay
        $delay = $service->calculateDelay($campaign);
        self::dispatch($this->campaignId)->delay(now()->addSeconds($delay));
    }

    private function ensureConversationExists(Campaign $campaign, CampaignRecipient $recipient, ?string $waMessageId): void
    {
        try {
            $phone = $this->normalizePhone($recipient->phone);

            DB::transaction(function () use ($campaign, $recipient, $phone, $waMessageId) {
                // Find or create CrmClient by phone
                $client = CrmClient::where('phone', $phone)->first();
                if (!$client) {
                    $client = CrmClient::create([
                        'phone'   => $phone,
                        'name'    => $recipient->name ?: $phone,
                        'source'  => 'whatsapp',
                        'status'  => 'new',
                        'user_id' => $campaign->user_id,
                    ]);
                }

                // Find existing open conversation or create one
                $conversation = Conversation::where('client_id', $client->id)
                    ->where('source', 'whatsapp')
                    ->where('status', 'open')
                    ->lockForUpdate()
                    ->latest('last_message_at')
                    ->first();

                $messageText = $campaign->message_text ?: "حملة: {$campaign->name}";

                if (!$conversation) {
                    $conversation = Conversation::create([
                        'client_id'       => $client->id,
                        'source'          => 'whatsapp',
                        'status'          => 'open',
                        'last_message'    => $messageText,
                        'last_message_at' => now(),
                        'unread_count'    => 0,
                    ]);
                } else {
                    $conversation->update([
                        'last_message'    => $messageText,
                        'last_message_at' => now(),
                    ]);
                }

                // Record the sent campaign message in the conversation
                Message::create([
                    'conversation_id'     => $conversation->id,
                    'whatsapp_message_id' => $waMessageId,
                    'content'             => $messageText,
                    'type'                => 'text',
                    'direction'           => 'out',
                    'is_private'          => false,
                    'sender_name'         => $campaign->name,
                    'status'              => $waMessageId ? 'sent' : null,
                    'sent_at'             => now(),
                ]);
            });
        } catch (\Exception $e) {
            Log::error("[Campaign #{$campaign->id}] فشل إنشاء المحادثة لـ {$recipient->phone}: {$e->getMessage()}");
        }
    }

    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/\D/', '', $phone); // digits only
        // Already has a country code (10+ digits starting with known prefixes)
        if (strlen($phone) >= 10) {
            return $phone;
        }
        // 8-digit Kuwait local number → prepend 965
        return '965' . $phone;
    }

    private function sendToRecipient(
        WhatsAppService $whatsapp,
        Campaign $campaign,
        CampaignRecipient $recipient,
        string $phoneNumberId
    ): array {
        $phone = $this->normalizePhone($recipient->phone);
        if ($campaign->template_name) {
            return $whatsapp->sendTemplate(
                $phone,
                $campaign->template_name,
                $campaign->template_language ?? 'ar',
                $this->buildTemplateComponents($campaign, $recipient),
                $phoneNumberId
            );
        }

        if ($campaign->image_path) {
            return $whatsapp->sendImage(
                $phone,
                $campaign->image_path,
                $campaign->message_text,
                $phoneNumberId
            );
        }

        return $whatsapp->sendMessage(
            $phone,
            $campaign->message_text,
            $phoneNumberId
        );
    }

    private function buildTemplateComponents(Campaign $campaign, CampaignRecipient $recipient): array
    {
        $components = [];

        // Add image header if template has one and campaign has an image
        $localTemplate = \App\Models\WhatsappTemplate::where('name', $campaign->template_name)->first();
        $imageUrl = $campaign->image_path ?: ($localTemplate?->header_content ?? null);

        if ($localTemplate && $localTemplate->header_type === 'image' && $imageUrl) {
            $components[] = [
                'type'       => 'header',
                'parameters' => [['type' => 'image', 'image' => ['link' => $imageUrl]]],
            ];
        }

        // Add body variables
        $vars = $recipient->variables ?? $campaign->template_variables ?? [];
        if (!empty($vars)) {
            $resolved = array_map(
                fn($v) => is_string($v) ? str_replace('{{name}}', $recipient->name ?? $recipient->phone, $v) : $v,
                $vars
            );
            $components[] = [
                'type'       => 'body',
                'parameters' => array_map(fn($v) => ['type' => 'text', 'text' => (string) $v], $resolved),
            ];
        }

        return $components;
    }

    private function pauseWithNotification(Campaign $campaign, string $title, string $body): void
    {
        // إرجاع processing إلى pending حتى لا تضيع عند الاستئناف
        $campaign->recipients()->where('status', 'processing')->update(['status' => 'pending']);
        $campaign->update(['status' => 'paused']);
        NotificationService::sendToAdmins(
            'campaign_paused',
            $title,
            $body,
            ['campaign_id' => $campaign->id]
        );
    }
}
