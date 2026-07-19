<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drip_sequence_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('drip_sequence_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('step_order');
            // Days since enrollment (not since the previous step) that this step should fire at —
            // keeps next-send computation a single addition instead of a running sum.
            $table->unsignedInteger('delay_days');
            $table->string('template_name');
            $table->string('template_language')->default('ar');
            $table->json('template_variables')->nullable();
            $table->timestamps();

            $table->index(['drip_sequence_id', 'step_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drip_sequence_steps');
    }
};
