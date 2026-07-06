<?php

namespace App\Services\Conversations;

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use Illuminate\Support\Facades\Log;

class CampaignReplyAttributionService
{
    /** If this phone was recently sent a campaign message, mark it as replied. */
    public function attribute(string $phone): void
    {
        $recipient = CampaignRecipient::where('phone_snapshot', $phone)
            ->whereIn('status', ['sent', 'delivered', 'read'])
            ->latest('sent_at')
            ->first();

        if (! $recipient) {
            return;
        }

        $recipient->update(['status' => 'replied']);
        Campaign::where('id', $recipient->campaign_id)->increment('reply_count');

        Log::info('[CampaignReplyAttribution] reply tracked', [
            'campaign_id' => $recipient->campaign_id,
            'phone' => $phone,
        ]);
    }
}
