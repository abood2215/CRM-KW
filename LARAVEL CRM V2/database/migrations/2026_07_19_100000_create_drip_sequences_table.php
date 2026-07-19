<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drip_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_number_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('active'); // active, paused
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drip_sequences');
    }
};
