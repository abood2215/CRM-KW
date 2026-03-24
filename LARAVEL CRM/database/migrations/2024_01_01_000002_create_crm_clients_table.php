<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->text('phone')->nullable();
            $table->text('email')->nullable();
            $table->enum('source', ['whatsapp', 'instagram', 'referral', 'google'])->default('whatsapp');
            $table->string('service')->nullable();
            $table->decimal('budget', 10, 2)->nullable();
            $table->enum('status', ['new', 'contacted', 'interested', 'booked', 'active', 'following'])->default('new');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_clients');
    }
};
