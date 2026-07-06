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
        Schema::create('whatsapp_numbers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->unique();
            $table->string('session_name')->nullable()->unique();
            $table->string('phone_number_id')->nullable();
            $table->text('access_token')->nullable();
            $table->string('business_account_id')->nullable();
            $table->string('api_type')->default('cloud');
            $table->string('status')->default('disconnected');
            $table->unsignedInteger('daily_limit')->default(250);
            $table->unsignedInteger('sent_today')->default(0);
            $table->unsignedInteger('week_number')->nullable();
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_numbers');
    }
};
