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
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('whatsapp_number_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_list_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('template_name')->nullable();
            $table->string('template_language')->nullable()->default('ar');
            $table->json('template_variables')->nullable();
            $table->text('message_text')->nullable();
            $table->string('image_path')->nullable();
            $table->string('status')->default('draft');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            // Signed, not unsigned: both are decrement()'d when a permanently-blocked
            // recipient is removed post-send, and an unsigned column throws instead of
            // going negative — which turns an already-rare race into a hard crash.
            $table->integer('total_recipients')->default(0);
            $table->integer('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->unsignedInteger('reply_count')->default(0);
            $table->unsignedInteger('open_count')->default(0);
            $table->unsignedInteger('block_count')->default(0);
            $table->unsignedInteger('delay_seconds')->default(30);
            $table->unsignedInteger('stop_on_fail_rate')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
