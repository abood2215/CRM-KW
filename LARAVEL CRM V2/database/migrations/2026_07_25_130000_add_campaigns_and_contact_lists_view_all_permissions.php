<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Campaigns and contact lists had no view-scoping at all — every authenticated user saw
     * every campaign and every list regardless of who created it, with no way to separate
     * visibility once a team grows past "everyone sees everything is fine". Granted to admin,
     * manager, AND agent here so existing installs see zero behavior change on deploy — an
     * admin can later uncheck it for a specific role from the existing Roles settings page to
     * actually restrict that role to its own campaigns/lists.
     */
    public function up(): void
    {
        $now = now();

        $permissionIds = [];
        foreach ([
            ['key' => 'campaigns.view_all', 'label' => 'مشاهدة كل الحملات (لا فقط حملاتي)', 'group' => 'الحملات'],
            ['key' => 'contact_lists.view_all', 'label' => 'مشاهدة كل قوائم التواصل (لا فقط قوائمي)', 'group' => 'قوائم التواصل'],
        ] as $permission) {
            $permissionIds[] = DB::table('permissions')->insertGetId([...$permission, 'created_at' => $now, 'updated_at' => $now]);
        }

        $roleIds = DB::table('roles')->whereIn('slug', ['admin', 'manager', 'agent'])->pluck('id');

        foreach ($roleIds as $roleId) {
            foreach ($permissionIds as $permissionId) {
                DB::table('role_permission')->insert(['role_id' => $roleId, 'permission_id' => $permissionId]);
            }
        }
    }

    public function down(): void
    {
        $permissionIds = DB::table('permissions')->whereIn('key', ['campaigns.view_all', 'contact_lists.view_all'])->pluck('id');

        DB::table('role_permission')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }
};
