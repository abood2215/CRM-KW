<?php

namespace App\Jobs;

use App\Events\ConversationUpdatedEvent;
use App\Events\NewMessageEvent;
use App\Models\AutoReply;
use App\Models\BusinessHour;
use App\Models\Conversation;
use App\Models\CrmClient;
use App\Models\Message;
use App\Models\WhatsappNumber;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessWhatsAppWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        protected array $payload
    ) {}

    public function handle(WhatsAppService $whatsapp): void
    {
        $entries = $this->payload['entry'] ?? [];

        foreach ($entries as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                if (($change['field'] ?? '') !== 'messages') {
                    continue;
                }

                $value = $change['value'] ?? [];

                // Incoming messages
                if (!empty($value['messages'])) {
                    foreach ($value['messages'] as $message) {
                        $this->handleIncomingMessage($message, $value, $whatsapp);
                    }
                }

                // Delivery status updates
                if (!empty($value['statuses'])) {
                    foreach ($value['statuses'] as $status) {
                        $this->handleStatusUpdate($status);
                    }
                }
            }
        }
    }

    protected function handleIncomingMessage(array $msgData, array $value, WhatsAppService $whatsapp): void
    {
        $fromPhone      = $msgData['from']      ?? null;
        $waMessageId    = $msgData['id']         ?? null;
        $messageType    = $msgData['type']       ?? 'text';
        $phoneNumberId  = $value['metadata']['phone_number_id'] ?? null;
        $contactName    = $value['contacts'][0]['profile']['name'] ?? null;

        if (!$fromPhone || !$waMessageId) {
            Log::warning('[WhatsApp Webhook] Missing from/id in message', $msgData);
            return;
        }

        Log::info('[WhatsApp Webhook] Incoming message', [
            'from'           => $fromPhone,
            'wamid'          => $waMessageId,
            'type'           => $messageType,
            'phone_number_id'=> $phoneNumberId,
        ]);

        // Prevent duplicate processing
        if (Message::where('whatsapp_message_id', $waMessageId)->exists()) {
            Log::debug('[WhatsApp Webhook] Duplicate message, skipping', ['wamid' => $waMessageId]);
            return;
        }

        // Resolve content
        $content = match ($messageType) {
            'text'     => $msgData['text']['body']             ?? '',
            'image'    => $msgData['image']['caption']         ?? '[صورة]',
            'video'    => '[فيديو]',
            'audio'    => '[رسالة صوتية]',
            'document' => $msgData['document']['filename']     ?? '[مستند]',
            'sticker'  => '[ستيكر]',
            'location' => '[موقع]',
            default    => '[رسالة غير مدعومة]',
        };

        $msgTypeNorm = in_array($messageType, ['text', 'image', 'file']) ? $messageType : 'text';

        // Find or create client
        $client = CrmClient::where('phone', $fromPhone)
            ->orWhere('phone', $this->formatPhoneForSearch($fromPhone))
            ->first();

        // Find or create conversation
        $conversation = $this->resolveConversation($client, $fromPhone, $phoneNumberId);

        // Create message
        $message = Message::create([
            'conversation_id'    => $conversation->id,
            'whatsapp_message_id'=> $waMessageId,
            'content'            => $content,
            'type'               => $msgTypeNorm,
            'direction'          => 'in',
            'is_private'         => false,
            'sender_name'        => $contactName ?? $fromPhone,
            'status'             => 'received',
            'sent_at'            => now(),
        ]);

        $conversation->update([
            'last_message'    => $content,
            'last_message_at' => now(),
            'unread_count'    => $conversation->unread_count + 1,
        ]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        Log::info('[WhatsApp Webhook] Message saved', ['message_id' => $message->id]);

        // Auto-reply logic
        $this->handleAutoReply($conversation, $fromPhone, $phoneNumberId, $whatsapp);
    }

    protected function handleStatusUpdate(array $statusData): void
    {
        $waMessageId = $statusData['id']     ?? null;
        $status      = $statusData['status'] ?? null;

        if (!$waMessageId || !$status) {
            return;
        }

        Log::info('[WhatsApp Webhook] Status update', [
            'wamid'  => $waMessageId,
            'status' => $status,
        ]);

        $message = Message::where('whatsapp_message_id', $waMessageId)->first();

        if ($message) {
            $message->update(['status' => $status]);
            event(new ConversationUpdatedEvent($message->conversation));
        }
    }

    protected function resolveConversation(?CrmClient $client, string $fromPhone, ?string $phoneNumberId): Conversation
    {
        $query = Conversation::where('source', 'whatsapp')->where('status', 'open');

        if ($client) {
            $conv = $query->where('client_id', $client->id)->latest('last_message_at')->first();
        } else {
            // Match by whatsapp_phone in meta when no client found
            $conv = null;
        }

        if (!$conv) {
            $conv = Conversation::create([
                'client_id'    => $client?->id,
                'status'       => 'open',
                'source'       => 'whatsapp',
                'unread_count' => 0,
            ]);

            Log::info('[WhatsApp Webhook] New conversation created', [
                'conversation_id' => $conv->id,
                'from'            => $fromPhone,
            ]);
        }

        return $conv;
    }

    protected function handleAutoReply(
        Conversation $conversation,
        string $toPhone,
        ?string $phoneNumberId,
        WhatsAppService $whatsapp
    ): void {
        $autoReply = null;

        // Check outside business hours
        $isOutsideHours = !$this->isWithinBusinessHours();

        if ($isOutsideHours) {
            $autoReply = AutoReply::where('trigger', 'outside_hours')
                ->where('is_active', true)
                ->first();
        }

        // Check first message
        if (!$autoReply) {
            $messageCount = $conversation->messages()->where('direction', 'in')->count();
            if ($messageCount === 1) {
                $autoReply = AutoReply::where('trigger', 'first_message')
                    ->where('is_active', true)
                    ->first();
            }
        }

        if (!$autoReply) {
            return;
        }

        // Find a connected WhatsApp Cloud API number
        $whatsappNumber = WhatsappNumber::whereNotNull('phone_number_id')
            ->where('status', 'connected')
            ->first();

        $pidToUse = $phoneNumberId ?? $whatsappNumber?->phone_number_id;

        if (!$pidToUse) {
            Log::warning('[WhatsApp Webhook] No phone_number_id for auto-reply');
            return;
        }

        try {
            $result = $whatsapp->sendMessage($toPhone, $autoReply->message, $pidToUse);

            Message::create([
                'conversation_id'    => $conversation->id,
                'whatsapp_message_id'=> $result['messages'][0]['id'] ?? null,
                'content'            => $autoReply->message,
                'type'               => 'text',
                'direction'          => 'out',
                'is_private'         => false,
                'sender_name'        => 'Auto Reply',
                'status'             => 'sent',
                'sent_at'            => now(),
            ]);

            $conversation->update([
                'last_message'    => $autoReply->message,
                'last_message_at' => now(),
            ]);

            Log::info('[WhatsApp Webhook] Auto-reply sent', ['trigger' => $autoReply->trigger]);

        } catch (\Exception $e) {
            Log::error('[WhatsApp Webhook] Auto-reply failed', ['error' => $e->getMessage()]);
        }
    }

    protected function isWithinBusinessHours(): bool
    {
        $now       = now();
        $dayOfWeek = (int) $now->format('w'); // 0=Sun, 6=Sat

        $businessHour = BusinessHour::where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (!$businessHour) {
            return false;
        }

        $currentTime = $now->format('H:i:s');
        return $currentTime >= $businessHour->start_time
            && $currentTime <= $businessHour->end_time;
    }

    protected function formatPhoneForSearch(string $phone): string
    {
        // Strip country code to find local format in DB
        if (str_starts_with($phone, '962')) {
            return '0' . substr($phone, 3);
        }
        return $phone;
    }
}
