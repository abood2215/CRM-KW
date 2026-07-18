<?php

namespace App\Jobs;

use App\Services\Conversations\InboundMessageService;
use App\Services\Conversations\MessageStatusUpdateService;
use App\Services\Whatsapp\TemplateStatusUpdateService;
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

    /** Without this, a payload that always throws retries near-instantly, competing with
     * everything else on the single-worker queue instead of backing off. */
    public function backoff(): array
    {
        return [5, 15, 30];
    }

    public function handle(
        InboundMessageService $inbound,
        MessageStatusUpdateService $statusUpdates,
        TemplateStatusUpdateService $templateStatusUpdates,
    ): void {
        foreach ($this->payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $field = $change['field'] ?? '';
                $value = $change['value'] ?? [];

                if ($field === 'message_template_status_update') {
                    $templateStatusUpdates->handle($value);

                    continue;
                }

                if ($field !== 'messages') {
                    continue;
                }

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
