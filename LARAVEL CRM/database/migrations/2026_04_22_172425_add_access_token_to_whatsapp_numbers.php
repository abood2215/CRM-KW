<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_numbers', function (Blueprint $table) {
            $table->text('access_token')->nullable()->after('phone_number_id');
            $table->string('business_account_id')->nullable()->after('access_token');
            $table->enum('api_type', ['baileys', 'cloud'])->default('baileys')->after('business_account_id');
        });
    }
    public function down(): void
    {
        Schema::table('whatsapp_numbers', function (Blueprint $table) {
            $table->dropColumn(['access_token', 'business_account_id', 'api_type']);
        });
    }
};
