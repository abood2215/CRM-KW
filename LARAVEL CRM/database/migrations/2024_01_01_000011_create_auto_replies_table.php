<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auto_replies', function (Blueprint $table) {
            $table->id();
            $table->enum('trigger', ['outside_hours', 'first_message'])->default('outside_hours');
            $table->text('message');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auto_replies');
    }
};
