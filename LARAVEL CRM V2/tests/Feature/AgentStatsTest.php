<?php

namespace Tests\Feature;

use App\Enums\ContactPipelineStage;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Role;
use App\Models\User;
use App\Services\Stats\StatsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Per-agent conversion rate and response time (2026-07-23) — previously only existed as a
 * single global average across the whole team, with no way to see which agent was actually
 * fast/slow or converting leads, because messages had no reliable link to who sent them
 * (sender_name was just a free-text snapshot, not a foreign key).
 */
class AgentStatsTest extends TestCase
{
    use RefreshDatabase;

    private function agent(): User
    {
        $role = Role::firstOrCreate(['slug' => 'agent'], ['name' => 'موظف', 'is_system' => true]);

        return User::create([
            'name' => 'موظفة', 'email' => uniqid().'@test.com', 'password' => 'secret',
            'role_id' => $role->id, 'is_active' => true,
        ]);
    }

    public function test_conversion_rate_only_counts_this_agents_own_contacts(): void
    {
        $agent = $this->agent();
        Contact::create(['name' => 'محجوز', 'phone' => '96500000001', 'source' => 'whatsapp', 'user_id' => $agent->id, 'pipeline_stage' => ContactPipelineStage::Booked->value]);
        Contact::create(['name' => 'جديد', 'phone' => '96500000002', 'source' => 'whatsapp', 'user_id' => $agent->id, 'pipeline_stage' => ContactPipelineStage::New->value]);

        $stats = app(StatsService::class)->agents();

        $row = collect($stats)->firstWhere('id', $agent->id);
        $this->assertSame(2, $row['clients_count']);
        $this->assertSame(50.0, $row['conversion_rate']);
    }

    /** created_at isn't fillable (Eloquent manages it) — forceFill to backdate it for the query. */
    private function message(array $attributes, $createdAt): Message
    {
        $message = Message::create($attributes);
        $message->forceFill(['created_at' => $createdAt])->save();

        return $message;
    }

    public function test_response_time_is_attributed_to_the_agent_who_actually_replied(): void
    {
        $fastAgent = $this->agent();
        $slowAgent = $this->agent();

        $contact = Contact::create(['name' => 'عميل', 'phone' => '96555555555', 'source' => 'whatsapp']);
        $conversation = Conversation::create(['contact_id' => $contact->id, 'source' => 'whatsapp']);

        $this->message(['conversation_id' => $conversation->id, 'direction' => 'in', 'type' => 'text', 'content' => 'مرحباً'], now()->subMinutes(10));
        $this->message(['conversation_id' => $conversation->id, 'user_id' => $fastAgent->id, 'direction' => 'out', 'type' => 'text', 'content' => 'رد'], now()->subMinutes(8));

        $contact2 = Contact::create(['name' => 'عميل2', 'phone' => '96555555556', 'source' => 'whatsapp']);
        $conversation2 = Conversation::create(['contact_id' => $contact2->id, 'source' => 'whatsapp']);
        $this->message(['conversation_id' => $conversation2->id, 'direction' => 'in', 'type' => 'text', 'content' => 'مرحباً'], now()->subMinutes(40));
        $this->message(['conversation_id' => $conversation2->id, 'user_id' => $slowAgent->id, 'direction' => 'out', 'type' => 'text', 'content' => 'رد'], now()->subMinutes(10));

        $stats = app(StatsService::class)->agents();

        $fastRow = collect($stats)->firstWhere('id', $fastAgent->id);
        $slowRow = collect($stats)->firstWhere('id', $slowAgent->id);
        $this->assertSame(2, $fastRow['avg_response_minutes']);
        $this->assertSame(30, $slowRow['avg_response_minutes']);
    }

    /** A campaign send has no human sender — must never be counted as anyone's response time. */
    public function test_automated_campaign_sends_have_no_user_id_and_are_excluded(): void
    {
        $agent = $this->agent();
        $contact = Contact::create(['name' => 'عميل', 'phone' => '96555555555', 'source' => 'whatsapp']);
        $conversation = Conversation::create(['contact_id' => $contact->id, 'source' => 'whatsapp']);

        $this->message(['conversation_id' => $conversation->id, 'direction' => 'in', 'type' => 'text', 'content' => 'مرحباً'], now()->subMinutes(10));
        $this->message(['conversation_id' => $conversation->id, 'user_id' => null, 'sender_name' => 'حملة تسويقية', 'direction' => 'out', 'type' => 'text', 'content' => 'عرض'], now()->subMinutes(9));

        $stats = app(StatsService::class)->agents();

        $row = collect($stats)->firstWhere('id', $agent->id);
        $this->assertNull($row['avg_response_minutes']);
    }
}
