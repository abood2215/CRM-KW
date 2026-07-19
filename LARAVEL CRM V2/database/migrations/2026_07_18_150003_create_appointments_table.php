<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // assigned consultant
            $table->string('customer_name')->nullable(); // pre-contact-match snapshot for self-service bookings
            $table->string('customer_phone')->nullable();
            $table->string('service');
            $table->dateTime('starts_at');
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->string('status')->default('pending'); // pending, confirmed, completed, cancelled, no_show
            $table->string('source')->default('internal'); // internal, self_service
            $table->string('booking_token')->nullable()->unique();
            $table->text('notes')->nullable();
            $table->timestamp('reminder_sent_at')->nullable();
            $table->timestamps();

            $table->index('starts_at');
        });

        // New permission, same pattern as campaigns.manage — appointments had no permission
        // key at all before this, since the feature didn't exist.
        $now = now();
        $permissionId = DB::table('permissions')->insertGetId([
            'key' => 'appointments.view_all',
            'label' => 'مشاهدة كل المواعيد (لا فقط مواعيدي)',
            'group' => 'المواعيد',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $roleIds = DB::table('roles')->whereIn('slug', ['admin', 'manager'])->pluck('id');
        foreach ($roleIds as $roleId) {
            DB::table('role_permission')->insert(['role_id' => $roleId, 'permission_id' => $permissionId]);
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')->where('key', 'appointments.view_all')->value('id');
        if ($permissionId) {
            DB::table('role_permission')->where('permission_id', $permissionId)->delete();
            DB::table('permissions')->where('id', $permissionId)->delete();
        }

        Schema::dropIfExists('appointments');
    }
};
