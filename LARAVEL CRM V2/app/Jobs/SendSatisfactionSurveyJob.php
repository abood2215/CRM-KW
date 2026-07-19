<?php

namespace App\Jobs;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\SatisfactionSurvey;
use App\Models\WhatsappNumber;
use App\Services\Whatsapp\WhatsAppSenderFactory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/** Dispatched with a delay from ConversationController::updateStatus when a conversation is marked resolved. */
class SendSatisfactionSurveyJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private readonly int $conversationId)
    {
    }

    public function handle(): void
    {
        $conversation = Conversation::find($this->conversationId);

        // Reopened (or deleted) since this was scheduled 2 hours ago — a survey right
        // after re-engaging would read as tone-deaf, so skip it entirely rather than delay it further.
        if (! $conversation || $conversation->status !== 'resolved' || ! $conversation->contact_id) {
            return;
        }

        $alreadySurveyed = SatisfactionSurvey::where('conversation_id', $conversation->id)
            ->where('created_at', '>=', now()->subHours(3))
            ->exists();
        if ($alreadySurveyed) {
            return;
        }

        $contact = $conversation->contact;
        if (! $contact) {
            return;
        }

        $number = WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();
        if (! $number || ! $number->access_token) {
            Log::warning('[SendSatisfactionSurveyJob] no connected Cloud API number');

            return;
        }

        $message = 'شكراً لتواصلك معنا! على مقياس من 1 إلى 5، كيف كانت تجربتك معنا؟ (فقط رد برقم من 1 إلى 5)';

        try {
            $sender = WhatsAppSenderFactory::make($number);
            $result = $sender->sendMessage($contact->phone, $message);

            Message::create([
                'conversation_id' => $conversation->id,
                'whatsapp_message_id' => $result['messages'][0]['id'] ?? null,
                'content' => $message,
                'type' => 'text',
                'direction' => 'out',
                'is_private' => false,
                'sender_name' => 'استبيان الرضا',
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            $conversation->update(['last_message' => $message, 'last_message_at' => now()]);

            SatisfactionSurvey::create([
                'conversation_id' => $conversation->id,
                'contact_id' => $contact->id,
                'sent_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('[SendSatisfactionSurveyJob] failed', ['error' => $e->getMessage()]);
        }
    }
}
