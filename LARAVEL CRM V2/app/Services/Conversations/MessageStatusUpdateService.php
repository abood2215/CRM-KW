<?php

namespace App\Services\Conversations;

use App\Events\ConversationUpdatedEvent;
use App\Events\MessageStatusUpdatedEvent;
use App\Models\CampaignRecipient;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Support\Facades\Log;

class MessageStatusUpdateService
{
    public function __construct(private readonly BlacklistPolicyService $blacklistPolicy)
    {
    }

    public function handle(array $statusData): void
    {
        $waMessageId = $statusData['id'] ?? null;
        $status = $statusData['status'] ?? null;

        if (! $waMessageId || ! $status) {
            return;
        }

        $message = Message::where('whatsapp_message_id', $waMessageId)->first();
        if ($message) {
            $update = ['status' => $status];
            if ($status === 'failed') {
                $errorCode = $statusData['errors'][0]['code'] ?? null;
                $errorTitle = $statusData['errors'][0]['title'] ?? null;
                $update['error_message'] = $this->resolveErrorLabel($errorCode, $errorTitle);

                // Unlike CampaignRecipient failures below, a plain conversation message failing
                // here logged nothing at all — the only trace was the (now user-facing) label on
                // the message row itself, with no code/title recorded anywhere for later digging.
                Log::warning('[MessageStatusUpdate] فشل توصيل رسالة', [
                    'message_id' => $message->id,
                    'wamid' => $waMessageId,
                    'error_code' => $errorCode,
                    'error_title' => $errorTitle,
                ]);
            }
            $message->update($update);
            event(new MessageStatusUpdatedEvent($message));

            $conversation = $message->conversation()->first();
            if ($status === 'failed') {
                // The failed message itself stays visible in the thread (with its error_message) —
                // this only keeps it from lingering as the conversation LIST's preview text, which
                // would misleadingly suggest it was delivered.
                $this->refreshConversationPreview($conversation);
            }

            event(new ConversationUpdatedEvent($conversation));
        }

        $recipient = CampaignRecipient::where('whatsapp_message_id', $waMessageId)->first();
        if (! $recipient) {
            return;
        }

        if (in_array($status, ['delivered', 'read'], true)) {
            $recipient->update(['status' => $status]);

            return;
        }

        if ($status !== 'failed') {
            return;
        }

        $this->handleDeliveryFailure($recipient, $statusData);
    }

    /** Recomputes last_message/last_message_at from the most recent non-failed message, since the failed one shouldn't be shown as the preview. */
    private function refreshConversationPreview(Conversation $conversation): void
    {
        $latest = $conversation->messages()
            ->where(fn ($q) => $q->whereNull('status')->orWhere('status', '!=', 'failed'))
            ->orderByDesc('sent_at')
            ->first();

        $conversation->update([
            'last_message' => $latest?->content,
            'last_message_at' => $latest?->sent_at,
        ]);
    }

    private function handleDeliveryFailure(CampaignRecipient $recipient, array $statusData): void
    {
        $campaign = $recipient->campaign;
        $errorCode = $statusData['errors'][0]['code'] ?? null;
        $errorTitle = $statusData['errors'][0]['title'] ?? null;

        Log::warning('[MessageStatusUpdate] delivery failed', ['phone' => $recipient->phone_snapshot, 'error_code' => $errorCode]);

        $wasPreviouslySent = in_array($recipient->status, ['sent', 'delivered', 'read'], true);
        if ($wasPreviouslySent && $campaign) {
            $campaign->decrement('sent_count');
            if ($campaign->sent_count < 0) {
                $campaign->update(['sent_count' => 0]);
            }
        }

        $isPermanentBlock = $this->blacklistPolicy->isPermanentBlock($errorCode);

        $contact = $recipient->contact;
        if ($contact) {
            $this->blacklistPolicy->applyFailure($contact, $isPermanentBlock);
        }

        if ($isPermanentBlock) {
            $campaign?->increment('block_count');
            // Permanently-blocked recipients are removed entirely — they never count toward stats again.
            $recipient->delete();
            if ($campaign) {
                $campaign->decrement('total_recipients');
                if ($campaign->total_recipients < 0) {
                    $campaign->update(['total_recipients' => 0]);
                }
            }

            return;
        }

        $recipient->update([
            'status' => 'failed',
            'error_message' => "[{$errorCode}] ".$this->resolveErrorLabel($errorCode, $errorTitle),
        ]);
        $campaign?->increment('failed_count');
    }

    /** Meta's 24h customer-service-window rejection (code 131047) gets a plain-language, actionable label. */
    private function resolveErrorLabel(?int $errorCode, ?string $errorTitle): string
    {
        if ($errorCode === 131047) {
            return 'انتهت نافذة 24 ساعة — استخدم قالب Template';
        }

        // Meta's own marketing-message pacing/anti-spam rejection — not a config or code
        // problem on our end, it's Meta unilaterally declining to deliver a MARKETING-category
        // template to a recipient it predicts won't engage with it.
        if ($errorCode === 131049) {
            return 'رفضت ميتا توصيل رسالة تسويقية للحفاظ على جودة النظام — المستقبِل غير متفاعل كفاية (كود ميتا: 131049)';
        }

        return $errorTitle ?? 'فشل التوصيل';
    }
}
