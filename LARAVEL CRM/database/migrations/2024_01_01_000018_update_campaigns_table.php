<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // حقول القالب والقائمة (ناقصة من الجدول الأصلي)
            if (!Schema::hasColumn('campaigns', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
            if (!Schema::hasColumn('campaigns', 'whatsapp_number_id')) {
                $table->foreignId('whatsapp_number_id')->nullable()->after('description')->constrained('whatsapp_numbers')->nullOnDelete();
            }
            if (!Schema::hasColumn('campaigns', 'template_name')) {
                $table->string('template_name')->nullable()->after('whatsapp_number_id');
            }
            if (!Schema::hasColumn('campaigns', 'template_language')) {
                $table->string('template_language')->nullable()->default('ar')->after('template_name');
            }
            if (!Schema::hasColumn('campaigns', 'template_variables')) {
                $table->json('template_variables')->nullable()->after('template_language');
            }
            if (!Schema::hasColumn('campaigns', 'contact_list_id')) {
                $table->foreignId('contact_list_id')->nullable()->after('template_variables')->constrained('contact_lists')->nullOnDelete();
            }
            if (!Schema::hasColumn('campaigns', 'open_count')) {
                $table->unsignedInteger('open_count')->default(0)->after('reply_count');
            }
            if (!Schema::hasColumn('campaigns', 'block_count')) {
                $table->unsignedInteger('block_count')->default(0)->after('open_count');
            }
            if (!Schema::hasColumn('campaigns', 'stop_on_fail_rate')) {
                $table->unsignedTinyInteger('stop_on_fail_rate')->default(10)->after('delay_seconds');
            }
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn([
                'description', 'whatsapp_number_id', 'template_name',
                'template_language', 'template_variables', 'contact_list_id',
                'open_count', 'block_count', 'stop_on_fail_rate',
            ]);
        });
    }
};
