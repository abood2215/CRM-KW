<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Conversations\InboundMessageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InboundMessageServiceTest extends TestCase
{
    use RefreshDatabase;

    private function handle(array $overrides = []): void
    {
        $msgData = array_merge([
            'from' => '96555555555',
            'id' => 'wamid.test123',
            'type' => 'text',
            'text' => ['body' => 'مرحباً'],
        ], $overrides);

        app(InboundMessageService::class)->handle($msgData, [
            'metadata' => ['phone_number_id' => 'unset'],
            'contacts' => [['profile' => ['name' => 'أحمد']]],
        ]);
    }

    public function test_creates_a_contact_conversation_and_message_for_a_first_time_sender(): void
    {
        $this->handle();

        $contact = Contact::where('phone', '96555555555')->first();
        $this->assertNotNull($contact);
        $this->assertSame('أحمد', $contact->name);

        $conversation = Conversation::where('contact_id', $contact->id)->first();
        $this->assertNotNull($conversation);
        $this->assertSame(1, $conversation->unread_count);

        $message = Message::where('whatsapp_message_id', 'wamid.test123')->first();
        $this->assertNotNull($message);
        $this->assertSame('مرحباً', $message->content);
        $this->assertSame('in', $message->direction);
    }

    /** Meta retries webhook delivery on its own — this must never double-count the same message. */
    public function test_ignores_a_duplicate_delivery_of_the_same_wamid(): void
    {
        $this->handle();
        $this->handle();

        $this->assertSame(1, Message::where('whatsapp_message_id', 'wamid.test123')->count());
        $this->assertSame(1, Conversation::first()->unread_count);
    }

    public function test_increments_unread_count_across_multiple_distinct_messages(): void
    {
        $this->handle(['id' => 'wamid.first']);
        $this->handle(['id' => 'wamid.second', 'text' => ['body' => 'رسالة ثانية']]);

        $this->assertSame(2, Conversation::first()->unread_count);
        $this->assertSame(2, Message::count());
    }
}
