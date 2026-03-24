<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes - Scheduled Jobs
|--------------------------------------------------------------------------
*/

// Reset WhatsApp daily sending limits at midnight
Schedule::job(new \App\Jobs\ResetDailyLimitJob)->daily()->at('00:00');
