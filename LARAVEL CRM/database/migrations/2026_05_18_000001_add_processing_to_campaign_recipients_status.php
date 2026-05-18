<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE campaign_recipients MODIFY COLUMN status ENUM('pending','processing','sent','failed','replied','delivered','read') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        // إعادة processing → pending قبل إزالتها من الـ ENUM
        DB::statement("UPDATE campaign_recipients SET status = 'pending' WHERE status = 'processing'");
        DB::statement("ALTER TABLE campaign_recipients MODIFY COLUMN status ENUM('pending','sent','failed','replied') NOT NULL DEFAULT 'pending'");
    }
};
