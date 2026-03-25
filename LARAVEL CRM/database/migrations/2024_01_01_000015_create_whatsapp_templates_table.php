<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_number_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('language')->default('ar');
            $table->enum('category', ['marketing', 'utility', 'authentication'])->default('marketing');
            $table->enum('status', ['approved', 'pending', 'rejected'])->default('pending');
            $table->enum('header_type', ['none', 'text', 'image', 'video', 'pdf'])->default('none');
            $table->text('header_content')->nullable();
            $table->text('body_text');
            $table->string('footer_text')->nullable();
            $table->json('buttons')->nullable();
            $table->unsignedTinyInteger('variables_count')->default(0);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_templates');
    }
};
