<?php

namespace App\Services\Conversations;

use App\Events\ConversationUpdatedEvent;
use App\Events\MessageStatusUpdatedEvent;
use App\Models\CampaignRecipient;
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
            $message->update(['status' => $status]);
            event(new MessageStatusUpdatedEvent($message));
            event(new ConversationUpdatedEvent($message->conversation()->first()));
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
        $isSessionExpiry = $errorCode === 131047;

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

        $errorLabel = $isSessionExpiry
            ? 'انتهت نافذة 24 ساعة — استخدم قالب Template'
            : ($errorTitle ?? 'فشل التوصيل');

        $recipient->update([
            'status' => 'failed',
            'error_message' => "[{$errorCode}] {$errorLabel}",
        ]);
        $campaign?->increment('failed_count');
    }
}
