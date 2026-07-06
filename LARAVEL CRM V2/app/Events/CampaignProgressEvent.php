<?php

namespace App\Events;

use App\Models\Campaign;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CampaignProgressEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Campaign $campaign)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('campaigns.'.$this->campaign->id)];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->campaign->id,
            'status' => $this->campaign->status,
            'sent_count' => $this->campaign->sent_count,
            'failed_count' => $this->campaign->failed_count,
            'reply_count' => $this->campaign->reply_count,
            'total_recipients' => $this->campaign->total_recipients,
            'progress_percentage' => $this->campaign->progress_percentage,
        ];
    }
}
