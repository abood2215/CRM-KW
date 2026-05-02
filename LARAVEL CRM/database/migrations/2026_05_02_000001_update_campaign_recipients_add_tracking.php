<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaign_recipients', function (Blueprint $table) {
            // Track WhatsApp message ID for delivery status updates
            $table->string('whatsapp_message_id')->nullable()->after('sent_at');

            // Per-recipient template variable overrides
            $table->json('variables')->nullable()->after('whatsapp_message_id');
        });

        // Expand status column to include delivered and read
        // Using raw SQL because SQLite doesn't support ALTER COLUMN for enums
        // For MySQL/PostgreSQL, use the modifyColumn approach below
        if (config('database.default') !== 'sqlite') {
            Schema::table('campaign_recipients', function (Blueprint $table) {
                $table->enum('status', ['pending', 'sent', 'delivered', 'read', 'replied', 'failed'])
                    ->default('pending')
                    ->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_message_id', 'variables']);
        });
    }
};
