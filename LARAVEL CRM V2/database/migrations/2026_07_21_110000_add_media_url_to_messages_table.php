<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Template sends with an image header were only ever recorded locally as plain text
     * (content = rendered body, type = 'text') — the header image itself was never saved,
     * so the CRM's own conversation view never showed it even when Meta delivered it fine.
     */
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('media_url')->nullable()->after('content');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('media_url');
        });
    }
};
