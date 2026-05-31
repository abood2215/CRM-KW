<?php

namespace App\Jobs;

use App\Events\ConversationUpdatedEvent;
use App\Events\MessageStatusUpdatedEvent;
use App\Events\NewMessageEvent;
use App\Models\AutoReply;
use App\Models\BusinessHour;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
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

        // Prevent duplicate processing — use cache lock so concurrent jobs don't both pass the check
        $msgLock = Cache::lock('wamsg-' . $waMessageId, 30);
        if (!$msgLock->get()) {
            Log::debug('[WhatsApp Webhook] Already being processed (lock), skipping', ['wamid' => $waMessageId]);
            return;
        }

        if (Message::where('whatsapp_message_id', $waMessageId)->exists()) {
            $msgLock->release();
            Log::debug('[WhatsApp Webhook] Duplicate message, skipping', ['wamid' => $waMessageId]);
            return;
        }

        // Resolve content
        $content = match ($messageType) {
            'text'        => $msgData['text']['body']                                   ?? '',
            'image'       => $msgData['image']['caption']                               ?? '[صورة]',
            'video'       => '[فيديو]',
            'audio'       => '[رسالة صوتية]',
            'document'    => $msgData['document']['filename']                           ?? '[مستند]',
            'sticker'     => '[ستيكر]',
            'location'    => '[موقع]',
            'button'      => $msgData['button']['text']                                 ?? '[زر]',
            'interactive' => $msgData['interactive']['button_reply']['title']
                          ?? $msgData['interactive']['list_reply']['title']
                          ?? '[تفاعل]',
            default       => '[رسالة غير مدعومة]',
        };

        $msgTypeNorm = in_array($messageType, ['text', 'image', 'file']) ? $messageType : 'text';

        // Find or create client — lock on phone to prevent duplicate clients from concurrent jobs
        $clientLock = Cache::lock('crm-client-phone:' . md5($fromPhone), 15);
        $clientLock->block(10);
        try {
            $client = CrmClient::where('phone', $fromPhone)
                ->orWhere('phone', $this->formatPhoneForSearch($fromPhone))
                ->first();

            if (!$client && $fromPhone) {
                $client = CrmClient::create([
                    'phone' => $fromPhone,
                    'name'  => $contactName ?? $fromPhone,
                ]);
            } elseif ($client && $contactName && ($client->name === $client->phone || !$client->name)) {
                $client->update(['name' => $contactName]);
            }
        } finally {
            $clientLock->release();
        }

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

        // Release the per-message lock now that we've saved it
        $msgLock->release();

        $conversation->update([
            'last_message'    => $content,
            'last_message_at' => now(),
            'unread_count'    => $conversation->unread_count + 1,
        ]);

        event(new NewMessageEvent($message));
        event(new ConversationUpdatedEvent($conversation->fresh()));

        Log::info('[WhatsApp Webhook] Message saved', ['message_id' => $message->id]);

        // إذا كان الرقم محظوراً وبعث رسالة بنفسه، يُرفع عنه الحظر تلقائياً
        $normalizedInbound = preg_replace('/\D/', '', $fromPhone);
        $inboundContact = Contact::where('phone', $normalizedInbound)->first();
        if ($inboundContact && $inboundContact->is_blacklisted) {
            $inboundContact->update(['is_blacklisted' => false]);
            Log::info('[WhatsApp Webhook] رُفع الحظر عن الرقم بعد تواصله معنا', ['phone' => $normalizedInbound]);
        }

        // Check if this is a reply to a campaign and increment reply_count
        $this->handleCampaignReply($fromPhone);

        // Auto-reply logic
        $this->handleAutoReply($conversation, $fromPhone, $phoneNumberId, $whatsapp);
    }

    protected function handleStatusUpdate(array $statusData): void
    {
        $waMessageId = $statusData['id']     ?? null;
        $status      = $statusData['status'] ?? null; // sent, delivered, read, failed

        if (!$waMessageId || !$status) {
            return;
        }

        Log::info('[WhatsApp Webhook] Status update', [
            'wamid'   => $waMessageId,
            'status'  => $status,
            'errors'  => $statusData['errors'] ?? null,
        ]);

        // Update conversation message status
        $message = Message::where('whatsapp_message_id', $waMessageId)->first();
        if ($message) {
            $message->update(['status' => $status]);
            event(new MessageStatusUpdatedEvent($message));
            event(new ConversationUpdatedEvent($message->conversation()->first()));
        }

        // Update campaign recipient status
        $recipient = CampaignRecipient::where('whatsapp_message_id', $waMessageId)->first();
        if (!$recipient) {
            return;
        }

        $previousStatus = $recipient->status; // احفظ الحالة قبل التحديث

        $recipientStatus = match ($status) {
            'delivered' => 'delivered',
            'read'      => 'read',
            'failed'    => 'failed',
            default     => null,
        };

        if ($recipientStatus) {
            $recipient->update(['status' => $recipientStatus]);
        }

        // المحادثة تُنشأ فقط عند رد الشخص (handleIncomingMessage) لا عند التوصيل

        // Detect block/spam reports from Meta error codes
        if ($status === 'failed') {
            $campaign = $recipient->campaign;

            $errorCode    = $statusData['errors'][0]['code'] ?? null;
            $errorTitle   = $statusData['errors'][0]['title'] ?? null;
            $errorDetails = $statusData['errors'][0]['error_data']['details'] ?? null;

            // حفظ رسالة الخطأ الحقيقية من Meta
            $errorMessage = $errorCode
                ? "[{$errorCode}] " . ($errorDetails ?: $errorTitle)
                : $errorTitle;

            if ($errorMessage) {
                $recipient->update(['error_message' => $errorMessage]);
            }

            // إذا كانت الرسالة سُجِّلت كـ "مُرسلة" سابقاً، نصحح العدادات
            $wasPreviouslySent = in_array($previousStatus, ['sent', 'delivered', 'read']);
            if ($wasPreviouslySent && $campaign) {
                $campaign->increment('failed_count');
                // نقص من sent_count مع ضمان عدم النزول تحت صفر
                $campaign->decrement('sent_count', 1);
                if ($campaign->sent_count < 0) {
                    $campaign->update(['sent_count' => 0]);
                }
            } elseif ($campaign) {
                $campaign->increment('failed_count');
            }

            // Error 131026 = message undeliverable (user blocked business)
            // Error 131047 = re-engagement message (24h rule)
            // Error 131049 = ecosystem quality throttle
            $isBlock = in_array($errorCode, [131026, 131047, 131049, 368]);

            if ($isBlock) {
                $campaign?->increment('block_count');
                Log::warning('[WhatsApp Webhook] Block/spam detected', [
                    'phone'      => $recipient->phone,
                    'error_code' => $errorCode,
                    'campaign'   => $recipient->campaign_id,
                ]);
            }

            // إضافة الرقم لقائمة الحظر حتى لا يُستهدف في أي حملة مستقبلية
            $normalizedPhone = preg_replace('/\D/', '', $recipient->phone);
            Contact::updateOrCreate(
                ['phone' => $normalizedPhone],
                ['is_blacklisted' => true, 'name' => $recipient->name ?? $normalizedPhone]
            );
            CrmClient::where('phone', $normalizedPhone)->update(['phone' => null]);
            Log::info('[WhatsApp Webhook] تم حظر رقم العميل بعد فشل التوصيل', ['phone' => $normalizedPhone]);
        }
    }

    protected function ensureCampaignConversation(CampaignRecipient $recipient): void
    {
        try {
            $campaign = $recipient->campaign;
            $phone    = preg_replace('/\D/', '', $recipient->phone);

            \DB::transaction(function () use ($campaign, $recipient, $phone) {
                $client = CrmClient::where('phone', $phone)->first();
                if (!$client) {
                    $client = CrmClient::create([
                        'phone'   => $phone,
                        'name'    => $recipient->name ?: $phone,
                        'source'  => 'whatsapp',
                        'status'  => 'new',
                        'user_id' => $campaign?->user_id,
                    ]);
                }

                $conversation = Conversation::where('client_id', $client->id)
                    ->where('source', 'whatsapp')
                    ->where('status', 'open')
                    ->latest('last_message_at')
                    ->first();

                $messageText = $campaign?->message_text ?: "حملة: {$campaign?->name}";

                if (!$conversation) {
                    $conversation = Conversation::create([
                        'client_id'       => $client->id,
                        'source'          => 'whatsapp',
                        'status'          => 'open',
                        'last_message'    => $messageText,
                        'last_message_at' => now(),
                        'unread_count'    => 0,
                    ]);
                }

                Message::firstOrCreate(
                    ['whatsapp_message_id' => $recipient->whatsapp_message_id],
                    [
                        'conversation_id' => $conversation->id,
                        'content'         => $messageText,
                        'type'            => 'text',
                        'direction'       => 'out',
                        'is_private'      => false,
                        'sender_name'     => $campaign?->name,
                        'status'          => 'delivered',
                        'sent_at'         => $recipient->sent_at ?? now(),
                    ]
                );
            });
        } catch (\Exception $e) {
            Log::error('[Webhook] فشل إنشاء محادثة الحملة: ' . $e->getMessage());
        }
    }

    protected function handleCampaignReply(string $fromPhone): void
    {
        // Find the most recent sent recipient for this phone across all running/completed campaigns
        $recipient = CampaignRecipient::where('phone', $fromPhone)
            ->whereIn('status', ['sent', 'delivered', 'read'])
            ->latest('sent_at')
            ->first();

        if (!$recipient) {
            return;
        }

        $recipient->update(['status' => 'replied']);

        Campaign::where('id', $recipient->campaign_id)->increment('reply_count');

        Log::info('[WhatsApp Webhook] Campaign reply tracked', [
            'campaign_id' => $recipient->campaign_id,
            'phone'       => $fromPhone,
        ]);
    }

    protected function resolveConversation(?CrmClient $client, string $fromPhone, ?string $phoneNumberId): Conversation
    {
        $lockKey = 'conv-resolve-' . ($client?->id ?? md5($fromPhone));
        $lock    = Cache::lock($lockKey, 15);
        $lock->block(10);

        try {
            return $this->resolveConversationLocked($client, $fromPhone);
        } finally {
            $lock->release();
        }
    }

    private function resolveConversationLocked(?CrmClient $client, string $fromPhone): Conversation
    {
        return \DB::transaction(function () use ($client, $fromPhone) {
            if ($client) {
                // 1. Find ALL open conversations for this client (lock rows to block concurrent inserts)
                //    Order by id (stable, never null) instead of last_message_at (can be null)
                $openConvs = Conversation::where('source', 'whatsapp')
                    ->where('status', 'open')
                    ->where('client_id', $client->id)
                    ->lockForUpdate()
                    ->orderBy('id')
                    ->get();

                if ($openConvs->isNotEmpty()) {
                    $conv = $openConvs->first();

                    // Close any duplicate open conversations, keeping the oldest
                    if ($openConvs->count() > 1) {
                        Conversation::whereIn('id', $openConvs->skip(1)->pluck('id'))
                            ->update(['status' => 'resolved']);
                        Log::info('[WhatsApp Webhook] Closed duplicate open conversations', [
                            'kept'    => $conv->id,
                            'closed'  => $openConvs->skip(1)->pluck('id'),
                        ]);
                    }

                    return $conv;
                }

                // 2. Any non-open conversation → reopen the most recent one
                $conv = Conversation::where('source', 'whatsapp')
                    ->where('client_id', $client->id)
                    ->lockForUpdate()
                    ->orderByDesc('id')
                    ->first();

                if ($conv) {
                    $conv->update(['status' => 'open']);
                    Log::info('[WhatsApp Webhook] Conversation reopened', [
                        'conversation_id' => $conv->id,
                        'from'            => $fromPhone,
                    ]);
                    return $conv;
                }
            }

            // 3. Create new conversation (first time ever for this client)
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

            return $conv;
        });
    }

    protected function handleAutoReply(
        Conversation $conversation,
        string $toPhone,
        ?string $phoneNumberId,
        WhatsAppService $whatsapp
    ): void {
        $autoReply = null;

        $clientId = $conversation->client_id;

        // Check outside business hours — always fires regardless of prior outgoing messages
        $isOutsideHours = !$this->isWithinBusinessHours();

        Log::debug('[WhatsApp Webhook] Auto-reply check', [
            'conversation_id'  => $conversation->id,
            'is_outside_hours' => $isOutsideHours,
            'time_now'         => now()->format('Y-m-d H:i:s'),
        ]);

        if ($isOutsideHours) {
            $autoReply = AutoReply::where('trigger', 'outside_hours')
                ->where('is_active', true)
                ->first();

            if (!$autoReply) {
                Log::debug('[WhatsApp Webhook] No active outside_hours auto-reply found');
            }
        }

        // Check first message — skip if we had any outgoing conversation in the last 24h
        // (avoids sending welcome messages to clients we already reached out to)
        if (!$autoReply) {
            $recentOutgoing = Message::where('conversation_id', $conversation->id)
                ->where('direction', 'out')
                ->where('sender_name', '!=', 'Auto Reply')
                ->where('created_at', '>=', now()->subHours(24))
                ->exists();

            if ($recentOutgoing) {
                Log::debug('[WhatsApp Webhook] first_message skipped — recent outgoing exists', [
                    'conversation_id' => $conversation->id,
                ]);
            } else {
                $alreadyReceivedAutoReply = $clientId
                    ? Message::where('direction', 'out')
                        ->where('sender_name', 'Auto Reply')
                        ->whereHas('conversation', fn($q) => $q->where('client_id', $clientId))
                        ->exists()
                    : Message::where('direction', 'out')
                        ->where('sender_name', 'Auto Reply')
                        ->where('conversation_id', $conversation->id)
                        ->exists();

                if ($alreadyReceivedAutoReply) {
                    Log::debug('[WhatsApp Webhook] first_message skipped — already received before', [
                        'client_id' => $clientId,
                    ]);
                } elseif (!$isOutsideHours) {
                    $autoReply = AutoReply::where('trigger', 'first_message')
                        ->where('is_active', true)
                        ->first();
                }
            }
        }

        if (!$autoReply) {
            Log::debug('[WhatsApp Webhook] No auto-reply to send', [
                'conversation_id' => $conversation->id,
                'is_outside_hours' => $isOutsideHours,
            ]);
            return;
        }

        // Atomic cooldown via Cache::add() — prevents race conditions between concurrent jobs.
        // Cache::add() only sets the key if it doesn't already exist (atomic operation).
        $cooldownKey = 'auto-reply-cooldown:' . $autoReply->trigger . ':' . ($clientId ?? 'conv:' . $conversation->id);
        $ttl         = $autoReply->trigger === 'outside_hours' ? 3600 : 86400 * 7;

        if (!Cache::add($cooldownKey, 1, $ttl)) {
            Log::debug('[WhatsApp Webhook] Auto-reply cooldown active, skipping', [
                'conversation_id' => $conversation->id,
                'trigger'         => $autoReply->trigger,
            ]);
            return;
        }

        // Find a connected WhatsApp Cloud API number
        $whatsappNumber = WhatsappNumber::whereNotNull('phone_number_id')
            ->where('status', 'connected')
            ->first();

        if (!$whatsappNumber || !$whatsappNumber->access_token) {
            Cache::forget($cooldownKey);
            Log::warning('[WhatsApp Webhook] No connected number with token for auto-reply');
            return;
        }

        try {
            $waService = new WhatsAppService($whatsappNumber->access_token, $whatsappNumber->phone_number_id);
            $result = $waService->sendMessage($toPhone, $autoReply->message);

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
            Cache::forget($cooldownKey);
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
        // Try stripping known Gulf/Arab country codes to match local format in DB
        foreach (['965', '966', '971', '962', '970', '974', '973', '968', '967'] as $code) {
            if (str_starts_with($phone, $code)) {
                return substr($phone, strlen($code));      // e.g. 96556551112 → 56551112
            }
        }
        return $phone;
    }
}
