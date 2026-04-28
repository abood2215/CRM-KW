<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_numbers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->unique();
            $table->string('session_name')->unique();
            $table->enum('status', ['connected', 'disconnected', 'banned'])->default('disconnected');
            $table->unsignedInteger('daily_limit')->default(200);
            $table->unsignedInteger('sent_today')->default(0);
            $table->unsignedInteger('week_number')->default(0);
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_numbers');
    }
};
