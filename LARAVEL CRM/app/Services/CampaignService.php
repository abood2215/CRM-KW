<?php

namespace App\Services;

use App\Events\CampaignProgressEvent;
use App\Jobs\ProcessCampaignJob;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\ContactList;
use App\Models\WhatsappNumber;
use Illuminate\Support\Facades\Log;

class CampaignService
{
    // بدء تشغيل الحملة
    public function startCampaign(Campaign $campaign): Campaign
    {
        if (!in_array($campaign->status, ['draft', 'scheduled', 'paused'])) {
            throw new \Exception('لا يمكن بدء هذه الحملة بحالتها الحالية.');
        }

        // التحقق من وجود مستلمين
        if ($campaign->recipients()->where('status', 'pending')->count() === 0) {
            throw new \Exception('لا يوجد مستلمون في انتظار الإرسال.');
        }

        $campaign->update([
            'status'     => 'running',
            'started_at' => $campaign->started_at ?? now(),
        ]);

        ProcessCampaignJob::dispatch($campaign->id);

        return $campaign->fresh();
    }

    // إيقاف الحملة مؤقتاً
    public function pauseCampaign(Campaign $campaign): Campaign
    {
        if (!in_array($campaign->status, ['running', 'scheduled'])) {
            throw new \Exception('لا يمكن إيقاف هذه الحملة.');
        }

        $campaign->update(['status' => 'paused']);

        return $campaign->fresh();
    }

    // استئناف الحملة
    public function resumeCampaign(Campaign $campaign): Campaign
    {
        if ($campaign->status !== 'paused') {
            throw new \Exception('الحملة ليست موقوفة.');
        }

        $campaign->update(['status' => 'running']);

        ProcessCampaignJob::dispatch($campaign->id);

        return $campaign->fresh();
    }

    // حساب التأخير العشوائي بين الرسائل (120-300 ثانية)
    public function calculateDelay(Campaign $campaign): int
    {
        $min = max(120, $campaign->delay_seconds ?? 120);
        $max = min(300, ($campaign->delay_seconds ?? 120) + 60);

        return rand($min, $max);
    }

    // التحقق من معدل الفشل (يتوقف إذا تجاوز 10%)
    public function checkFailRate(Campaign $campaign): bool
    {
        $total = $campaign->sent_count + $campaign->failed_count;

        if ($total === 0) return false;

        $failRate = ($campaign->failed_count / $total) * 100;

        return $failRate >= ($campaign->stop_on_fail_rate ?? 10);
    }

    // جلب إحصائيات الحملة التفصيلية
    public function getAnalytics(Campaign $campaign): array
    {
        $total     = $campaign->total_recipients;
        $sent      = $campaign->sent_count;
        $failed    = $campaign->failed_count;
        $replied   = $campaign->reply_count;
        $blocked   = $campaign->block_count ?? 0;
        $pending   = $campaign->recipients()->where('status', 'pending')->count();

        $deliveryRate = $total > 0 ? round(($sent / $total) * 100, 1) : 0;
        $replyRate    = $sent > 0  ? round(($replied / $sent) * 100, 1) : 0;
        $failRate     = $total > 0 ? round(($failed / $total) * 100, 1) : 0;
        $blockRate    = $sent > 0  ? round(($blocked / $sent) * 100, 1) : 0;

        // إحصائيات المستلمين حسب الحالة
        $recipientsByStatus = $campaign->recipients()
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return [
            'total_recipients' => $total,
            'sent_count'       => $sent,
            'failed_count'     => $failed,
            'reply_count'      => $replied,
            'block_count'      => $blocked,
            'pending_count'    => $pending,
            'delivery_rate'    => $deliveryRate,
            'reply_rate'       => $replyRate,
            'fail_rate'        => $failRate,
            'block_rate'       => $blockRate,
            'progress'         => $campaign->progress_percentage,
            'recipients_by_status' => $recipientsByStatus,
            'started_at'       => $campaign->started_at?->toISOString(),
            'completed_at'     => $campaign->completed_at?->toISOString(),
            'duration_minutes' => $campaign->started_at && $campaign->completed_at
                ? $campaign->started_at->diffInMinutes($campaign->completed_at)
                : null,
        ];
    }

    // جلب حد الإرسال اليومي حسب أسبوع النشاط
    public function getDailyLimit(WhatsappNumber $number): int
    {
        return match (true) {
            $number->week_number >= 3 => 1000,
            $number->week_number === 2 => 500,
            default                   => 250,
        };
    }
}
