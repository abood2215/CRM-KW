<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\WhatsappNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A business running more than one connected WhatsApp number used to have replies pick
 * "first connected number" on every single message — a conversation could silently hop
 * numbers mid-thread. preferredWhatsappNumber() should keep it pinned to whichever number
 * it was last actually sent from.
 */
class ConversationPreferredNumberTest extends TestCase
{
    use RefreshDatabase;

    private function number(string $phone, string $status = 'connected'): WhatsappNumber
    {
        return WhatsappNumber::create([
            'name' => $phone, 'phone' => $phone, 'phone_number_id' => "pnid-{$phone}",
            'access_token' => 'fake', 'api_type' => 'cloud', 'status' => $status,
        ]);
    }

    public function test_sticks_to_the_number_last_used_in_this_conversation(): void
    {
        $numberA = $this->number('96500000001');
        $numberB = $this->number('96500000002');

        $contact = Contact::create(['phone' => '96555555555', 'name' => 'عميل', 'source' => 'whatsapp']);
        $conversation = Conversation::create(['contact_id' => $contact->id, 'source' => 'whatsapp']);

        Message::create([
            'conversation_id' => $conversation->id, 'whatsapp_number_id' => $numberB->id,
            'content' => 'رسالة سابقة', 'type' => 'text', 'direction' => 'out', 'sent_at' => now(),
        ]);

        // numberA has the lower id and would win a plain ->first() auto-pick — this asserts
        // the conversation ignores that and stays on numberB, the one it actually used before.
        $this->assertSame($numberB->id, $conversation->preferredWhatsappNumber()->id);
    }

    public function test_falls_back_to_first_connected_number_when_conversation_never_sent_before(): void
    {
        $numberA = $this->number('96500000001');

        $contact = Contact::create(['phone' => '96555555555', 'name' => 'عميل', 'source' => 'whatsapp']);
        $conversation = Conversation::create(['contact_id' => $contact->id, 'source' => 'whatsapp']);

        $this->assertSame($numberA->id, $conversation->preferredWhatsappNumber()->id);
    }

    public function test_falls_back_when_the_previously_used_number_is_no_longer_connected(): void
    {
        $numberA = $this->number('96500000001');
        $numberB = $this->number('96500000002', status: 'disconnected');

        $contact = Contact::create(['phone' => '96555555555', 'name' => 'عميل', 'source' => 'whatsapp']);
        $conversation = Conversation::create(['contact_id' => $contact->id, 'source' => 'whatsapp']);

        Message::create([
            'conversation_id' => $conversation->id, 'whatsapp_number_id' => $numberB->id,
            'content' => 'رسالة سابقة', 'type' => 'text', 'direction' => 'out', 'sent_at' => now(),
        ]);

        $this->assertSame($numberA->id, $conversation->preferredWhatsappNumber()->id);
    }
}
