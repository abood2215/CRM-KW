<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->unsignedBigInteger('chatwoot_message_id')->nullable();
            $table->text('content')->nullable();
            $table->enum('type', ['text', 'image', 'file'])->default('text');
            $table->enum('direction', ['in', 'out'])->default('in');
            $table->boolean('is_private')->default(false);
            $table->string('sender_name')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
