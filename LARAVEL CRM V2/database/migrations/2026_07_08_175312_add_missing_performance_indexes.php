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
        // contacts.user_id already has an index via its foreign key constraint — no need to duplicate it.
        Schema::table('contacts', function (Blueprint $table) {
            $table->index('pipeline_stage');
            $table->index('is_blacklisted');
        });

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropIndex(['pipeline_stage']);
            $table->dropIndex(['is_blacklisted']);
        });

        Schema::table('campaign_recipients', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });
    }
};
