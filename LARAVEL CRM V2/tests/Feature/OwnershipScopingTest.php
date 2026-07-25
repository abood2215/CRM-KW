<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\ContactList;
use App\Models\Role;
use App\Models\User;
use App\Policies\CampaignPolicy;
use App\Policies\ContactListPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Campaigns and contact lists were "shared team resource by design" with zero scoping at
 * all — every authenticated user saw every campaign/list regardless of who created it. This
 * covers the new campaigns.view_all / contact_lists.view_all permission (2026-07-25): granted
 * to every role by default (no behavior change for existing installs), but an admin can now
 * revoke it for a role to actually separate visibility once a team needs that.
 */
class OwnershipScopingTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        $role = Role::create(['name' => 'test-role', 'slug' => 'role-'.uniqid(), 'is_system' => false]);

        return User::create(['name' => 'مستخدم', 'email' => uniqid().'@test.com', 'password' => 'secret', 'role_id' => $role->id, 'is_active' => true]);
    }

    private function grant(User $user, string $permissionKey): void
    {
        $permissionId = DB::table('permissions')->where('key', $permissionKey)->value('id')
            ?? DB::table('permissions')->insertGetId(['key' => $permissionKey, 'label' => 'x', 'group' => 'x', 'created_at' => now(), 'updated_at' => now()]);

        DB::table('role_permission')->insert(['role_id' => $user->role_id, 'permission_id' => $permissionId]);
        $user->unsetRelation('role');
    }

    public function test_campaign_scoping_restricts_to_own_campaigns_without_view_all(): void
    {
        $restrictedUser = $this->user();
        $privilegedUser = $this->user();
        $this->grant($privilegedUser, 'campaigns.view_all');

        Campaign::create(['name' => 'حملتي', 'user_id' => $restrictedUser->id, 'status' => 'draft']);
        Campaign::create(['name' => 'حملة زميل', 'user_id' => $privilegedUser->id, 'status' => 'draft']);

        $restrictedVisible = CampaignPolicy::scopeVisibleTo(Campaign::query(), $restrictedUser)->pluck('name')->all();
        $privilegedVisible = CampaignPolicy::scopeVisibleTo(Campaign::query(), $privilegedUser)->pluck('name')->all();

        $this->assertSame(['حملتي'], $restrictedVisible);
        $this->assertEqualsCanonicalizing(['حملتي', 'حملة زميل'], $privilegedVisible);
    }

    public function test_contact_list_scoping_restricts_to_own_lists_without_view_all(): void
    {
        $restrictedUser = $this->user();
        $otherUser = $this->user();

        ContactList::create(['name' => 'قائمتي', 'user_id' => $restrictedUser->id]);
        ContactList::create(['name' => 'قائمة زميل', 'user_id' => $otherUser->id]);

        $visible = ContactListPolicy::scopeVisibleTo(ContactList::query(), $restrictedUser)->pluck('name')->all();

        $this->assertSame(['قائمتي'], $visible);
    }
}
