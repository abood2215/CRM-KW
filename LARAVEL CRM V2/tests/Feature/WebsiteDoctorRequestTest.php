<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class WebsiteDoctorRequestTest extends TestCase
{
    use RefreshDatabase;

    private array $payload = [
        'request_id' => 41, 'name' => 'سارة', 'phone' => '+965 5111 2222',
        'topic' => 'استشارة تربوية', 'mode' => 'حضوري بالمركز', 'notes' => 'بخصوص ابني', 'source' => 'instagram',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.website.token' => 'web-token']);
        Event::fake();
    }

    private function user(bool $active = true, string $slug = null): User
    {
        $role = Role::where('slug', $slug ?? 'x')->first() ?? Role::create(['name' => 'r', 'slug' => $slug ?? 'role-'.uniqid(), 'is_system' => false]);

        return User::create(['name' => 'موظف', 'email' => uniqid().'@t.com', 'password' => 'secret', 'role_id' => $role->id, 'is_active' => $active]);
    }

    public function test_request_becomes_a_call_task_and_notifies_staff(): void
    {
        $agent = $this->user();
        $inactive = $this->user(false);
        $tester = $this->user(true, 'test');

        $this->postJson('/api/website/doctor-requests', $this->payload)->assertUnauthorized();
        $this->postJson('/api/website/doctor-requests', $this->payload, ['X-Website-Token' => 'nope'])->assertUnauthorized();

        $res = $this->postJson('/api/website/doctor-requests', $this->payload, ['X-Website-Token' => 'web-token'])
            ->assertOk()->assertJson(['ok' => true, 'duplicate' => false]);

        $contact = Contact::where('phone', '96551112222')->firstOrFail();
        $this->assertSame('سارة', $contact->name);
        $this->assertSame('website', $contact->source);

        $task = Task::findOrFail($res->json('task_id'));
        $this->assertSame($contact->id, $task->contact_id);
        $this->assertSame('call', $task->type);
        $this->assertSame('high', $task->priority);
        $this->assertSame('موعد مع د. طارق — استشارة تربوية (حضوري بالمركز)', $task->title);
        $this->assertStringContainsString('ملاحظات العميل: بخصوص ابني', $task->description);

        $this->assertSame(1, Notification::where('user_id', $agent->id)->where('type', 'doctor_request')->count());
        $this->assertSame(0, Notification::whereIn('user_id', [$inactive->id, $tester->id])->count());
        $n = Notification::where('user_id', $agent->id)->first();
        $this->assertSame('سارة · 96551112222 · استشارة تربوية · حضوري بالمركز', $n->message);
        $this->assertSame($contact->id, $n->data['contact_id']);
    }

    public function test_a_retry_does_not_duplicate_and_an_existing_contact_is_reused(): void
    {
        $this->user();
        $existing = Contact::create(['phone' => '96551112222', 'name' => 'سارة القديمة', 'source' => 'whatsapp']);

        $this->postJson('/api/website/doctor-requests', $this->payload, ['X-Website-Token' => 'web-token'])->assertOk();
        $this->postJson('/api/website/doctor-requests', $this->payload, ['X-Website-Token' => 'web-token'])->assertJson(['duplicate' => true]);

        $this->assertSame(1, Contact::count());
        $this->assertSame('سارة القديمة', $existing->fresh()->name);
        $this->assertSame(1, Task::count());
        $this->assertSame(1, Notification::count());
    }
}
