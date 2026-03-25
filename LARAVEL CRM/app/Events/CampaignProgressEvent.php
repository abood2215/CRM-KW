<?php

namespace App\Events;

use App\Models\Campaign;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

// حدث تقدم الحملة - يُرسل عبر WebSocket للواجهة الأمامية
class CampaignProgressEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Campaign $campaign
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('campaigns'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'campaign.progress';
    }

    public function broadcastWith(): array
    {
        return [
            'id'               => $this->campaign->id,
            'name'             => $this->campaign->name,
            'status'           => $this->campaign->status,
            'sent_count'       => $this->campaign->sent_count,
            'failed_count'     => $this->campaign->failed_count,
            'total_recipients' => $this->campaign->total_recipients,
            'progress'         => $this->campaign->progress_percentage,
        ];
    }
}
