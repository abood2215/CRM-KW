<?php

namespace App\Jobs;

use App\Events\ConversationUpdatedEvent;
use App\Models\Conversation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * يحوّل المحادثات المفتوحة إلى "معلقة" عندما تنتهي نافذة الـ 24 ساعة لواتساب.
 *
 * القاعدة: إذا لم يرسل العميل رسالة في آخر 24 ساعة، لا يمكن إرسال رسائل
 * حرّة له — فقط قوالب معتمدة. الحالة "معلقة" تعكس هذا القيد.
 *
 * المحادثة تعود "نشطة" تلقائياً حين يرد العميل (ProcessWhatsAppWebhookJob).
 */
class ExpireConversationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $expired = Conversation::where('status', 'open')
            ->where(function ($q) {
                // الحالة 1: للمحادثة رسائل واردة، لكن آخرها كان منذ أكثر من 24 ساعة
                $q->whereHas('messages', fn ($m) => $m->where('direction', 'in'))
                  ->whereDoesntHave('messages', fn ($m) =>
                      $m->where('direction', 'in')
                        ->where('created_at', '>=', now()->subHours(24))
                  );

                // الحالة 2: لم يرد العميل قط، والمحادثة أُنشئت منذ أكثر من 24 ساعة
                $q->orWhere(function ($q2) {
                    $q2->whereDoesntHave('messages', fn ($m) => $m->where('direction', 'in'))
                       ->where('created_at', '<=', now()->subHours(24));
                });
            })
            ->get();

        if ($expired->isEmpty()) {
            return;
        }

        $ids = $expired->pluck('id')->toArray();

        Conversation::whereIn('id', $ids)->update(['status' => 'pending']);

        foreach ($expired as $conv) {
            $conv->status = 'pending';
            event(new ConversationUpdatedEvent($conv));
        }

        Log::info('[ExpireConversations] حُوِّلت إلى معلقة بعد انتهاء نافذة 24 ساعة', [
            'count'           => count($ids),
            'conversation_ids' => $ids,
        ]);
    }
}
