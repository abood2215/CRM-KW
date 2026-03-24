<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'manager', 'agent'])->default('agent')->after('password');
            $table->string('avatar')->nullable()->after('role');
            $table->string('phone')->nullable()->after('avatar');
            $table->timestamp('last_seen_at')->nullable()->after('phone');
            $table->boolean('is_active')->default(true)->after('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'avatar', 'phone', 'last_seen_at', 'is_active']);
        });
    }
};
