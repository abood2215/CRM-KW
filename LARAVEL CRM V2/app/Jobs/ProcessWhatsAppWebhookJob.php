<?php

namespace App\Jobs;

use App\Services\Conversations\InboundMessageService;
use App\Services\Conversations\MessageStatusUpdateService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessWhatsAppWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(protected array $payload)
    {
    }

    public function handle(InboundMessageService $inbound, MessageStatusUpdateService $statusUpdates): void
    {
        foreach ($this->payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                if (($change['field'] ?? '') !== 'messages') {
                    continue;
                }

                $value = $change['value'] ?? [];

                foreach ($value['messages'] ?? [] as $message) {
                    $inbound->handle($message, $value);
                }

                foreach ($value['statuses'] ?? [] as $status) {
                    $statusUpdates->handle($status);
                }
            }
        }
    }
}
