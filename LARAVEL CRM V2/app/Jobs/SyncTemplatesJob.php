<?php

namespace App\Jobs;

use App\Models\WhatsappNumber;
use App\Services\Whatsapp\TemplateSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncTemplatesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(protected ?int $whatsappNumberId = null)
    {
    }

    public function handle(TemplateSyncService $service): void
    {
        $numbers = $this->whatsappNumberId
            ? WhatsappNumber::where('id', $this->whatsappNumberId)->get()
            : WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->get();

        foreach ($numbers as $number) {
            try {
                $synced = $service->sync($number);
                Log::info("[SyncTemplatesJob] رقم #{$number->id}: تمت مزامنة {$synced} قالب");
            } catch (\Exception $e) {
                Log::error("[SyncTemplatesJob] رقم #{$number->id} فشل: {$e->getMessage()}");
            }
        }
    }
}
