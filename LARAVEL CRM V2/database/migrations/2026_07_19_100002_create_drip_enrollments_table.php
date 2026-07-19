<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drip_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('drip_sequence_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->timestamp('enrolled_at');
            $table->unsignedInteger('current_step')->default(0);
            $table->string('status')->default('active'); // active, completed, stopped
            $table->timestamp('next_send_at')->nullable();
            $table->timestamps();

            $table->unique(['drip_sequence_id', 'contact_id']);
            $table->index(['status', 'next_send_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drip_enrollments');
    }
};
