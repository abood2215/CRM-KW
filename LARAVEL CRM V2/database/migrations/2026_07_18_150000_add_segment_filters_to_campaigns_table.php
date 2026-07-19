<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Lets a campaign target contacts by criteria (pipeline stage/tags/source/last-contacted) instead of only a static contact_list_id. */
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->json('segment_filters')->nullable()->after('contact_list_id');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('segment_filters');
        });
    }
};
