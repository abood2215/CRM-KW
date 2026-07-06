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
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('phone')->unique();
            $table->string('email')->nullable();
            $table->string('source')->nullable();
            $table->json('tags')->nullable();

            // Pipeline concern (was CrmClient) — null pipeline_stage means "campaign-only contact"
            $table->string('pipeline_stage')->nullable();
            $table->string('service')->nullable();
            $table->decimal('budget', 10, 2)->nullable();
            $table->text('notes')->nullable();

            // Campaign-consent concern (was Contact)
            $table->boolean('opt_in')->default(false);
            $table->timestamp('opt_in_date')->nullable();
            $table->boolean('opt_out')->default(false);
            $table->timestamp('opt_out_date')->nullable();
            $table->boolean('is_blacklisted')->default(false);
            $table->timestamp('blacklisted_until')->nullable();
            $table->unsignedInteger('fail_count')->default(0);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
