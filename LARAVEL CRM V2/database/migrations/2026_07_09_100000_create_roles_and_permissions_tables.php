<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Permission keys grouped for the roles/permissions UI, mapped 1:1 to real checks found in the codebase. */
    private const PERMISSIONS = [
        ['key' => 'contacts.view_all', 'label' => 'مشاهدة كل جهات الاتصال (لا فقط جهاتي)', 'group' => 'جهات الاتصال'],
        ['key' => 'contacts.view_budget', 'label' => 'مشاهدة حقل الميزانية بجهات الاتصال', 'group' => 'جهات الاتصال'],
        ['key' => 'tasks.view_all', 'label' => 'مشاهدة كل المهام (لا فقط مهامي)', 'group' => 'المهام'],
        ['key' => 'conversations.view_all', 'label' => 'مشاهدة كل المحادثات (لا فقط المعيّنة لي)', 'group' => 'المحادثات'],
        ['key' => 'conversations.assign', 'label' => 'تعيين المحادثات لموظف آخر', 'group' => 'المحادثات'],
        ['key' => 'contact_lists.manage_others', 'label' => 'تعديل/حذف قوائم تواصل أنشأها آخرون', 'group' => 'قوائم التواصل'],
        ['key' => 'canned_responses.manage_global', 'label' => 'تعديل/حذف الردود الجاهزة المشتركة', 'group' => 'الردود الجاهزة'],
        ['key' => 'whatsapp_templates.manage', 'label' => 'إدارة قوالب واتساب (إنشاء/تعديل/حذف/مزامنة)', 'group' => 'واتساب'],
        ['key' => 'whatsapp_numbers.manage', 'label' => 'إدارة أرقام واتساب (إنشاء/تعديل/حذف)', 'group' => 'واتساب'],
        ['key' => 'users.manage', 'label' => 'إدارة المستخدمين', 'group' => 'المستخدمون'],
        ['key' => 'settings.manage', 'label' => 'تعديل الإعدادات العامة (ساعات العمل، الردود التلقائية)', 'group' => 'الإعدادات'],
        ['key' => 'stats.view_agents', 'label' => 'مشاهدة إحصائيات مقارنة الموظفين', 'group' => 'التقارير'],
        ['key' => 'activity_log.view', 'label' => 'مشاهدة سجل النشاط', 'group' => 'الإعدادات'],
        ['key' => 'roles.manage', 'label' => 'إدارة الأدوار والصلاحيات', 'group' => 'الإعدادات'],
    ];

    /** Role → permission keys, replicating today's admin/manager/agent behavior exactly. */
    private const ROLE_PERMISSIONS = [
        'admin' => [
            'contacts.view_all', 'contacts.view_budget', 'tasks.view_all', 'conversations.view_all',
            'conversations.assign', 'contact_lists.manage_others', 'canned_responses.manage_global',
            'whatsapp_templates.manage', 'whatsapp_numbers.manage', 'users.manage', 'settings.manage',
            'stats.view_agents', 'activity_log.view', 'roles.manage',
        ],
        'manager' => [
            'contacts.view_all', 'contacts.view_budget', 'tasks.view_all', 'conversations.view_all',
            'conversations.assign', 'contact_lists.manage_others', 'canned_responses.manage_global',
            'whatsapp_templates.manage', 'settings.manage', 'stats.view_agents', 'activity_log.view',
        ],
        'agent' => [],
    ];

    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->string('group');
            $table->timestamps();
        });

        Schema::create('role_permission', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('role')->constrained('roles');
        });

        $now = now();

        $roleIds = [];
        foreach (['admin' => 'مدير النظام', 'manager' => 'مشرف', 'agent' => 'موظف'] as $slug => $name) {
            $roleIds[$slug] = DB::table('roles')->insertGetId([
                'name' => $name,
                'slug' => $slug,
                'is_system' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $permissionIds = [];
        foreach (self::PERMISSIONS as $permission) {
            $permissionIds[$permission['key']] = DB::table('permissions')->insertGetId([
                'key' => $permission['key'],
                'label' => $permission['label'],
                'group' => $permission['group'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $pivotRows = [];
        foreach (self::ROLE_PERMISSIONS as $slug => $keys) {
            foreach ($keys as $key) {
                $pivotRows[] = ['role_id' => $roleIds[$slug], 'permission_id' => $permissionIds[$key]];
            }
        }
        DB::table('role_permission')->insert($pivotRows);

        foreach ($roleIds as $slug => $roleId) {
            DB::table('users')->where('role', $slug)->update(['role_id' => $roleId]);
        }

        // Any user without a matching legacy role string (shouldn't happen) falls back to agent.
        DB::table('users')->whereNull('role_id')->update(['role_id' => $roleIds['agent']]);

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable(false)->change();
            $table->dropColumn('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('agent')->after('role_id');
        });

        DB::table('users')
            ->join('roles', 'roles.id', '=', 'users.role_id')
            ->update(['users.role' => DB::raw('roles.slug')]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });

        Schema::dropIfExists('role_permission');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
