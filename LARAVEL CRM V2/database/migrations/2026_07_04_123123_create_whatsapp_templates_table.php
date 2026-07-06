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
        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_number_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('language')->default('ar');
            $table->string('category')->default('marketing');
            $table->string('status')->default('approved');
            $table->string('header_type')->default('none');
            $table->text('header_content')->nullable();
            $table->text('body_text');
            $table->text('footer_text')->nullable();
            $table->json('buttons')->nullable();
            $table->unsignedInteger('variables_count')->default(0);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
            $table->unique(['whatsapp_number_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_templates');
    }
};
