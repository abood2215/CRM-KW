<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Caches the durable media id Meta returns after uploading a header image once, so sends
     * reuse that id instead of re-sending the image by `link` on every single message (which
     * Meta flags as non-compliant once a campaign fans out to many recipients).
     */
    public function up(): void
    {
        Schema::table('whatsapp_templates', function (Blueprint $table) {
            $table->string('header_media_id')->nullable()->after('header_content');
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('image_media_id')->nullable()->after('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_templates', function (Blueprint $table) {
            $table->dropColumn('header_media_id');
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('image_media_id');
        });
    }
};
