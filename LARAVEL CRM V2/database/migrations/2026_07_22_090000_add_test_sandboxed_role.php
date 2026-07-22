<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * A deliberately zero-permission role for handing an outside collaborator a throwaway
     * account to reproduce a bug live — distinct from `agent` (which also has zero permissions
     * by default, but real staff accounts). CampaignController::index and
     * ConversationPolicy::scopeVisibleTo both special-case this role's slug directly to hide
     * pre-existing campaigns and unassigned conversations, which normal zero-permission staff
     * accounts are intentionally still allowed to see (the shared-inbox pattern).
     */
    public function up(): void
    {
        DB::table('roles')->insert([
            'name' => 'حساب تجربة',
            'slug' => 'test',
            'is_system' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('roles')->where('slug', 'test')->delete();
    }
};
