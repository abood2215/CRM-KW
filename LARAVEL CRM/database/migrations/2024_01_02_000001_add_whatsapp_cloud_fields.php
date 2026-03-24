<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add WhatsApp Cloud API fields to messages
        Schema::table('messages', function (Blueprint $table) {
            $table->string('whatsapp_message_id')->nullable()->after('chatwoot_message_id');
            $table->enum('status', ['pending', 'sent', 'delivered', 'read', 'failed', 'received'])
                  ->nullable()
                  ->after('sent_at');
        });

        // Add phone_number_id to whatsapp_numbers (for Cloud API)
        Schema::table('whatsapp_numbers', function (Blueprint $table) {
            $table->string('phone_number_id')->nullable()->after('session_name');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_message_id', 'status']);
        });

        Schema::table('whatsapp_numbers', function (Blueprint $table) {
            $table->dropColumn('phone_number_id');
        });
    }
};
