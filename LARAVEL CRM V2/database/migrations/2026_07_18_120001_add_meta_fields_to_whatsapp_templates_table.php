<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_templates', function (Blueprint $table) {
            $table->string('meta_template_id')->nullable()->after('name');
            $table->text('rejection_reason')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_templates', function (Blueprint $table) {
            $table->dropColumn(['meta_template_id', 'rejection_reason']);
        });
    }
};
