<?php

namespace App\Services\Campaigns;

use App\Jobs\ProcessCampaignJob;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\User;

class CampaignService
{
    public function __construct(private readonly CampaignRecipientResolver $resolver)
    {
    }

    /** @return array{campaign: Campaign, skipped: int} */
    public function createFromRequest(array $data, User $actor): array
    {
        $recipientInput = $data['recipients'] ?? [];
        unset($data['recipients']);

        $resolved = $this->resolver->resolve(
            $recipientInput,
            $data['contact_list_id'] ?? null,
            $data['template_name'] ?? null,
            $actor,
            $data['segment_filters'] ?? null,
        );

        if (empty($resolved['recipients'])) {
            throw new \RuntimeException('لا يوجد مستلمون مؤهلون لهذه الحملة (الكل محظور أو ألغى الاشتراك أو مكرر).');
        }

        $data['user_id'] = $actor->id;
        $data['total_recipients'] = count($resolved['recipients']);
        $data['status'] = ! empty($data['scheduled_at']) ? 'scheduled' : 'draft';

        $campaign = Campaign::create($data);

        foreach ($resolved['recipients'] as $r) {
            CampaignRecipient::create([
                'campaign_id' => $campaign->id,
                'contact_id' => $r['contact']->id,
                'phone_snapshot' => $r['contact']->phone,
                'name_snapshot' => $r['name'],
                'variables' => $r['variables'],
            ]);
        }

        return ['campaign' => $campaign, 'skipped' => $resolved['skipped']];
    }

    public function startCampaign(Campaign $campaign): Campaign
    {
        if (! in_array($campaign->status, ['draft', 'scheduled', 'paused'])) {
            throw new \RuntimeException('لا يمكن بدء هذه الحملة بحالتها الحالية.');
        }

        if ($campaign->recipients()->whereIn('status', ['pending', 'failed'])->count() === 0) {
            throw new \RuntimeException('لا يوجد مستلمون في انتظار الإرسال.');
        }

        if ($campaign->status === 'paused') {
            $campaign->recipients()->where('status', 'failed')->update(['status' => 'pending', 'error_message' => null]);
            $campaign->update(['failed_count' => 0]);
        }

        $campaign->update([
            'status' => 'running',
            'started_at' => $campaign->started_at ?? now(),
        ]);

        ProcessCampaignJob::dispatch($campaign->id);

        return $campaign->fresh();
    }

    public function pauseCampaign(Campaign $campaign): Campaign
    {
        if (! in_array($campaign->status, ['running', 'scheduled'])) {
            throw new \RuntimeException('لا يمكن إيقاف هذه الحملة.');
        }

        $campaign->update(['status' => 'paused']);

        return $campaign->fresh();
    }

    public function resumeCampaign(Campaign $campaign): Campaign
    {
        if ($campaign->status !== 'paused') {
            throw new \RuntimeException('الحملة ليست موقوفة.');
        }

        $campaign->recipients()->whereIn('status', ['processing', 'failed'])->update([
            'status' => 'pending',
            'error_message' => null,
        ]);
        $campaign->update(['status' => 'running', 'failed_count' => 0]);

        ProcessCampaignJob::dispatch($campaign->id);

        return $campaign->fresh();
    }

    /** ±20% jitter around the configured delay to avoid a fixed pattern Meta could flag. */
    public function calculateDelay(Campaign $campaign): int
    {
        $base = max(1, $campaign->delay_seconds ?? 30);
        $jitter = (int) ($base * 0.2);

        return rand($base, $base + $jitter);
    }

    public function checkFailRate(Campaign $campaign): bool
    {
        if (! $campaign->stop_on_fail_rate) {
            return false;
        }

        $total = $campaign->sent_count + $campaign->failed_count;
        if ($total < 10) {
            return false;
        }

        return (($campaign->failed_count / $total) * 100) >= $campaign->stop_on_fail_rate;
    }

    public function getAnalytics(Campaign $campaign): array
    {
        $total = $campaign->total_recipients;
        $sent = $campaign->sent_count;
        $failed = $campaign->failed_count;
        $replied = $campaign->reply_count;
        $blocked = $campaign->block_count ?? 0;
        $pending = $campaign->recipients()->where('status', 'pending')->count();

        $recipientsByStatus = $campaign->recipients()
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return [
            'total_recipients' => $total,
            'sent_count' => $sent,
            'failed_count' => $failed,
            'reply_count' => $replied,
            'block_count' => $blocked,
            'pending_count' => $pending,
            'delivery_rate' => $total > 0 ? round(($sent / $total) * 100, 1) : 0,
            'reply_rate' => $sent > 0 ? round(($replied / $sent) * 100, 1) : 0,
            'fail_rate' => $total > 0 ? round(($failed / $total) * 100, 1) : 0,
            'block_rate' => $sent > 0 ? round(($blocked / $sent) * 100, 1) : 0,
            'progress' => $campaign->progress_percentage,
            'recipients_by_status' => $recipientsByStatus,
            'started_at' => $campaign->started_at?->toISOString(),
            'completed_at' => $campaign->completed_at?->toISOString(),
            'duration_minutes' => $campaign->started_at && $campaign->completed_at
                ? $campaign->started_at->diffInMinutes($campaign->completed_at)
                : null,
        ];
    }
}
