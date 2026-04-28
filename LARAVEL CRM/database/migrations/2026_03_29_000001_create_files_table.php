<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('original_name');        // الاسم الأصلي للملف
            $table->string('stored_name');          // الاسم المخزن على القرص
            $table->string('path');                 // المسار الكامل داخل storage
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->default(0); // بالبايت
            $table->string('category')->default('other');   // csv, image, document, other
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
