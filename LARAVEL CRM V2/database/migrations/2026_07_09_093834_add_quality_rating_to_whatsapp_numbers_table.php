<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('whatsapp_numbers', function (Blueprint $table) {
            // Meta's GREEN/YELLOW/RED rating — a drop here throttles/blocks sending
            // and is exactly what silently broke the old app before this rewrite.
            $table->string('quality_rating')->nullable()->after('status');
            $table->timestamp('quality_checked_at')->nullable()->after('quality_rating');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('whatsapp_numbers', function (Blueprint $table) {
            $table->dropColumn(['quality_rating', 'quality_checked_at']);
        });
    }
};
