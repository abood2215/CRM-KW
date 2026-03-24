<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('message_text')->nullable();
            $table->string('image_path')->nullable();
            $table->enum('status', ['draft', 'scheduled', 'running', 'paused', 'completed'])->default('draft');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('total_recipients')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->unsignedInteger('reply_count')->default(0);
            $table->unsignedInteger('delay_seconds')->default(5);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
