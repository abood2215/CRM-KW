<?php

namespace App\Services\Conversations;

use App\Models\AutoReply;
use App\Models\BusinessHour;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\WhatsappNumber;
use App\Services\Whatsapp\WhatsAppSenderFactory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AutoReplyService
{
    public function maybeReply(Conversation $conversation, string $toPhone): void
    {
        $autoReply = $this->resolveApplicableAutoReply($conversation);

        if (! $autoReply) {
            return;
        }

        $cooldownKey = 'auto-reply-cooldown:'.$autoReply->trigger.':'.($conversation->contact_id ?? 'conv:'.$conversation->id);
        $ttl = $autoReply->trigger === 'outside_hours' ? 3600 : 86400 * 7;

        if (! Cache::add($cooldownKey, 1, $ttl)) {
            return;
        }

        $number = WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();
        if (! $number || ! $number->access_token) {
            Cache::forget($cooldownKey);
            Log::warning('[AutoReplyService] no connected Cloud API number for auto-reply');

            return;
        }

        try {
            $sender = WhatsAppSenderFactory::make($number);
            $result = $sender->sendMessage($toPhone, $autoReply->message);

            Message::create([
                'conversation_id' => $conversation->id,
                'whatsapp_message_id' => $result['messages'][0]['id'] ?? null,
                'content' => $autoReply->message,
                'type' => 'text',
                'direction' => 'out',
                'is_private' => false,
                'sender_name' => 'Auto Reply',
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            $conversation->update(['last_message' => $autoReply->message, 'last_message_at' => now()]);

            Log::info('[AutoReplyService] sent', ['trigger' => $autoReply->trigger]);
        } catch (\Exception $e) {
            Cache::forget($cooldownKey);
            Log::error('[AutoReplyService] failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * "First message" and "outside hours" are independent conditions, not an either/or —
     * a message can be both, or a business with no business_hours rows configured for today
     * (isWithinBusinessHours() defaults to false = "outside hours") would otherwise permanently
     * block the first_message trigger from ever being reached. Check first_message first since
     * it's the more specific/welcoming case; fall back to outside_hours independently.
     */
    private function resolveApplicableAutoReply(Conversation $conversation): ?AutoReply
    {
        // "first message" trigger — skip if we've messaged this contact recently, or already sent this before.
        $recentOutgoing = Message::where('conversation_id', $conversation->id)
            ->where('direction', 'out')
            ->where('sender_name', '!=', 'Auto Reply')
            ->where('created_at', '>=', now()->subHours(24))
            ->exists();

        if (! $recentOutgoing) {
            $contactId = $conversation->contact_id;
            $alreadyReceived = $contactId
                ? Message::where('direction', 'out')
                    ->where('sender_name', 'Auto Reply')
                    ->whereHas('conversation', fn ($q) => $q->where('contact_id', $contactId))
                    ->exists()
                : Message::where('direction', 'out')
                    ->where('sender_name', 'Auto Reply')
                    ->where('conversation_id', $conversation->id)
                    ->exists();

            if (! $alreadyReceived) {
                $firstMessageReply = AutoReply::where('trigger', 'first_message')->where('is_active', true)->first();
                if ($firstMessageReply) {
                    return $firstMessageReply;
                }
            }
        }

        if (! $this->isWithinBusinessHours()) {
            return AutoReply::where('trigger', 'outside_hours')->where('is_active', true)->first();
        }

        return null;
    }

    private function isWithinBusinessHours(): bool
    {
        $now = now();
        $businessHour = BusinessHour::where('day_of_week', (int) $now->format('w'))
            ->where('is_active', true)
            ->first();

        if (! $businessHour) {
            return false;
        }

        $currentTime = $now->format('H:i:s');

        return $currentTime >= $businessHour->start_time && $currentTime <= $businessHour->end_time;
    }
}
