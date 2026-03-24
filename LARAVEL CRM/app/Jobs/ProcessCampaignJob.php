<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\WhatsappNumber;
use App\Services\BaileysService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;
    public int $tries = 1;

    public function __construct(
        protected int $campaignId
    ) {}

    public function handle(BaileysService $baileys): void
    {
        $campaign = Campaign::find($this->campaignId);

        if (!$campaign || $campaign->status === 'paused') {
            return;
        }

        $campaign->update([
            'status' => 'running',
            'started_at' => $campaign->started_at ?? now(),
        ]);

        $whatsappNumber = WhatsappNumber::where('status', 'connected')->first();

        if (!$whatsappNumber) {
            Log::error("No connected WhatsApp number for campaign {$campaign->id}");
            return;
        }

        $recipients = $campaign->recipients()
            ->where('status', 'pending')
            ->get();

        foreach ($recipients as $recipient) {
            // Check if campaign was paused
            $campaign->refresh();
            if ($campaign->status === 'paused') {
                return;
            }

            if (!$whatsappNumber->canSend()) {
                Log::warning("WhatsApp number {$whatsappNumber->phone} daily limit reached");
                break;
            }

            try {
                if ($campaign->image_path) {
                    $baileys->sendImage(
                        $whatsappNumber->session_name,
                        $recipient->phone,
                        $campaign->image_path,
                        $campaign->message_text
                    );
                } else {
                    $baileys->sendMessage(
                        $whatsappNumber->session_name,
                        $recipient->phone,
                        $campaign->message_text
                    );
                }

                $recipient->update([
                    'status' => 'sent',
                    'sent_at' => now(),
                ]);

                $campaign->increment('sent_count');
                $whatsappNumber->incrementSent();

            } catch (\Exception $e) {
                $recipient->update([
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                ]);
                $campaign->increment('failed_count');
                Log::error("Campaign send failed: {$e->getMessage()}");
            }

            // Delay between messages
            sleep($campaign->delay_seconds);
        }

        // Check if all recipients processed
        $pendingCount = $campaign->recipients()->where('status', 'pending')->count();
        if ($pendingCount === 0) {
            $campaign->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        }
    }
}
