<?php

namespace App\Services\Conversations;

use App\Events\ConversationUpdatedEvent;
use App\Events\MessageStatusUpdatedEvent;
use App\Events\NewMessageEvent;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\SatisfactionSurvey;
use App\Models\User;
use App\Models\WhatsappNumber;
use App\Services\Notifications\NotificationService;
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

            $number = $phoneNumberId
                ? WhatsappNumber::where('phone_number_id', $phoneNumberId)->first()
                : WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();

            $phone = PhoneNumber::normalize($fromPhone);
            $content = $this->resolveContent($msgData, $messageType, $number);
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

            if ($conversation->wasRecentlyCreated) {
                $this->maybeAutoAssignSpecialist($conversation, $contact);
            }

            $this->maybeRecordSurveyResponse($conversation, $content);

            $message = Message::create([
                'conversation_id' => $conversation->id,
                'whatsapp_number_id' => $number?->id,
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

    /**
     * Auto-assigns a brand-new conversation to the one consultant whose specialty matches
     * the contact's requested service. Stays unassigned on zero or ambiguous (2+) matches —
     * same safe default as today's fully-manual assignment, just skipped when there's a
     * single, confident match.
     */
    private function maybeAutoAssignSpecialist(Conversation $conversation, Contact $contact): void
    {
        if (! $contact->service) {
            return;
        }

        $service = mb_strtolower(trim($contact->service));

        $matches = User::where('is_active', true)
            ->whereNotNull('specialty')
            ->get()
            ->filter(function (User $user) use ($service) {
                $specialty = mb_strtolower(trim($user->specialty));

                return $specialty !== '' && (str_contains($service, $specialty) || str_contains($specialty, $service));
            });

        if ($matches->count() !== 1) {
            return;
        }

        $specialist = $matches->first();
        $conversation->update(['assigned_user_id' => $specialist->id]);

        NotificationService::send(
            $specialist->id,
            'conversation_auto_assigned',
            'محادثة جديدة معيّنة لك',
            "تم تعيين محادثة جديدة مع \"{$contact->name}\" لك تلقائياً حسب تخصصك.",
            ['conversation_id' => $conversation->id],
        );
    }

    /**
     * If this conversation has a satisfaction survey awaiting a reply and the inbound text
     * starts with a digit 1-5, record it as the rating (anything after the digit is kept as
     * a free-text comment). Anything else — a normal message, an out-of-range number — is
     * left alone; it still gets created as a regular message either way.
     */
    private function maybeRecordSurveyResponse(Conversation $conversation, string $content): void
    {
        $survey = SatisfactionSurvey::where('conversation_id', $conversation->id)
            ->whereNotNull('sent_at')
            ->whereNull('responded_at')
            ->latest('sent_at')
            ->first();

        if (! $survey) {
            return;
        }

        if (! preg_match('/^\s*([1-5])\b\s*(.*)$/us', trim($content), $matches)) {
            return;
        }

        $survey->update([
            'rating' => (int) $matches[1],
            'comment' => trim($matches[2]) ?: null,
            'responded_at' => now(),
        ]);
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

    private function resolveContent(array $msgData, string $type, ?WhatsappNumber $number): string
    {
        $mediaId = match ($type) {
            'image' => $msgData['image']['id'] ?? null,
            'video' => $msgData['video']['id'] ?? null,
            'audio' => $msgData['audio']['id'] ?? null,
            'document' => $msgData['document']['id'] ?? null,
            'sticker' => $msgData['sticker']['id'] ?? null,
            default => null,
        };

        $mediaUrl = $mediaId ? $this->downloadMedia($mediaId, $number) : null;

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
            // Meta's own catch-all for message types it won't forward content for (view-once
            // media, polls, community messages, ...) — shows Meta's own reason when it sends one,
            // instead of surfacing the raw wire value "unsupported" as if it were a bug.
            'unsupported' => '[نوع رسالة غير مدعوم من واتساب'.(($reason = $msgData['errors'][0]['title'] ?? null) ? " — {$reason}" : '').']',
            default => '[نوع رسالة غير معروف: '.$type.']',
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

    private function downloadMedia(string $mediaId, ?WhatsappNumber $number): ?string
    {
        if (! $number || ! $number->access_token) {
            return null;
        }

        return (new CloudApiWhatsAppSender($number->access_token, $number->phone_number_id))->downloadMedia($mediaId);
    }
}
