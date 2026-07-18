<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Campaigns had no permission key at all — every authenticated user (including "agent") could create/start/pause/delete any campaign. */
    public function up(): void
    {
        $now = now();

        $permissionId = DB::table('permissions')->insertGetId([
            'key' => 'campaigns.manage',
            'label' => 'إدارة الحملات (إنشاء/تعديل/حذف/بدء/إيقاف)',
            'group' => 'الحملات',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $roleIds = DB::table('roles')->whereIn('slug', ['admin', 'manager'])->pluck('id');

        foreach ($roleIds as $roleId) {
            DB::table('role_permission')->insert([
                'role_id' => $roleId,
                'permission_id' => $permissionId,
            ]);
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')->where('key', 'campaigns.manage')->value('id');

        if ($permissionId) {
            DB::table('role_permission')->where('permission_id', $permissionId)->delete();
            DB::table('permissions')->where('id', $permissionId)->delete();
        }
    }
};
