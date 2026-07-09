<?php

namespace App\Services\Conversations;

use App\Events\ConversationUpdatedEvent;
use App\Events\MessageStatusUpdatedEvent;
use App\Events\NewMessageEvent;
use App\Models\Contact;
use App\Models\Message;
use App\Models\WhatsappNumber;
use App\Services\Whatsapp\CloudApiWhatsAppSender;
use App\ValueObjects\PhoneNumber;
use Illuminate\Support\Facades\Cache;

class InboundMessageService
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly BlacklistPolicyService $blacklistPolicy,
        private readonly CampaignReplyAttributionService $replyAttribution,
        private readonly AutoReplyService $autoReply,
    ) {
    }

    public function handle(array $msgData, array $value): void
    {
        $fromPhone = $msgData['from'] ?? null;
        $waMessageId = $msgData['id'] ?? null;
        $messageType = $msgData['type'] ?? 'text';
        $phoneNumberId = $value['metadata']['phone_number_id'] ?? null;
        $contactName = $value['contacts'][0]['profile']['name'] ?? null;

        if (! $fromPhone || ! $waMessageId) {
            return;
        }

        // De-dupe: Meta retries webhook delivery, and a lock avoids two concurrent jobs
        // both passing the "does this message exist yet" check. Released in `finally` —
        // otherwise an exception here leaks the lock, and the job's automatic retry finds
        // it still held and silently returns without ever completing the work (message loss).
        $lock = Cache::lock('wamsg-'.$waMessageId, 30);
        if (! $lock->get()) {
            return;
        }

        try {
            // A reaction targets an existing message — attach it there directly instead of
            // creating a floating message with no visible link to what was reacted to.
            if ($messageType === 'reaction') {
                $this->handleReaction($msgData);

                return;
            }

            if (Message::where('whatsapp_message_id', $waMessageId)->exists()) {
                return;
            }

            $phone = PhoneNumber::normalize($fromPhone);
            $content = $this->resolveContent($msgData, $messageType, $phoneNumberId);
            $type = $this->normalizeType($messageType);

            $contact = Contact::firstOrCreate(
                ['phone' => $phone],
                ['name' => $contactName ?? $phone, 'source' => 'whatsapp'],
            );

            if ($contactName && ($contact->name === $contact->phone || ! $contact->name)) {
                $contact->update(['name' => $contactName]);
            }

            // A contact who messages us clearly hasn't blocked the business — clear any block.
            $this->blacklistPolicy->clearIfMessaged($contact);

            $conversation = $this->conversations->resolveForContact($contact);

            $message = Message::create([
                'conversation_id' => $conversation->id,
                'whatsapp_message_id' => $waMessageId,
                'content' => $content,
                'type' => $type,
                'direction' => 'in',
                'is_private' => false,
                'sender_name' => $contactName ?? $phone,
                'status' => 'received',
                'sent_at' => now(),
            ]);
        } finally {
            $lock->release();
        }

        $conversation->update([
            'last_message' => $content,
            'last_message_at' => now(),
            'unread_count' => $conversation->unread_count + 1,
        ]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        $this->replyAttribution->attribute($phone);
        $this->autoReply->maybeReply($conversation, $phone);
    }

    /** Meta sends an empty/missing emoji to mean "reaction removed" — clear it in that case. */
    private function handleReaction(array $msgData): void
    {
        $targetWaMessageId = $msgData['reaction']['message_id'] ?? null;
        if (! $targetWaMessageId) {
            return;
        }

        $targetMessage = Message::where('whatsapp_message_id', $targetWaMessageId)->first();
        if (! $targetMessage) {
            return;
        }

        $emoji = $msgData['reaction']['emoji'] ?? '';
        $targetMessage->update(['reaction_emoji' => $emoji !== '' ? $emoji : null]);

        event(new MessageStatusUpdatedEvent($targetMessage));
    }

    private function resolveContent(array $msgData, string $type, ?string $phoneNumberId): string
    {
        $mediaId = match ($type) {
            'image' => $msgData['image']['id'] ?? null,
            'video' => $msgData['video']['id'] ?? null,
            'audio' => $msgData['audio']['id'] ?? null,
            'document' => $msgData['document']['id'] ?? null,
            'sticker' => $msgData['sticker']['id'] ?? null,
            default => null,
        };

        $mediaUrl = $mediaId ? $this->downloadMedia($mediaId, $phoneNumberId) : null;

        return match ($type) {
            'text' => $msgData['text']['body'] ?? '',
            'image' => $mediaUrl ?? $msgData['image']['caption'] ?? '[صورة]',
            'video' => $mediaUrl ?? '[فيديو]',
            'audio' => $mediaUrl ?? '[رسالة صوتية]',
            'document' => $mediaUrl ?? $msgData['document']['filename'] ?? '[مستند]',
            'sticker' => $mediaUrl ?? '[ستيكر]',
            'location' => '[موقع: '.($msgData['location']['latitude'] ?? '').','.($msgData['location']['longitude'] ?? '').']',
            'button' => $msgData['button']['text'] ?? '[زر]',
            'interactive' => $msgData['interactive']['button_reply']['title']
                ?? $msgData['interactive']['list_reply']['title']
                ?? '[تفاعل]',
            'contacts' => '[جهة اتصال: '.($msgData['contacts'][0]['name']['formatted_name'] ?? '').']',
            'order' => '[طلب شراء]',
            default => '[رسالة غير مدعومة: '.$type.']',
        };
    }

    private function normalizeType(string $messageType): string
    {
        return match ($messageType) {
            'image' => 'image',
            'video' => 'video',
            'audio' => 'audio',
            'document' => 'file',
            default => 'text',
        };
    }

    private function downloadMedia(string $mediaId, ?string $phoneNumberId): ?string
    {
        $number = $phoneNumberId
            ? WhatsappNumber::where('phone_number_id', $phoneNumberId)->first()
            : WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();

        if (! $number || ! $number->access_token) {
            return null;
        }

        return (new CloudApiWhatsAppSender($number->access_token, $number->phone_number_id))->downloadMedia($mediaId);
    }
}
