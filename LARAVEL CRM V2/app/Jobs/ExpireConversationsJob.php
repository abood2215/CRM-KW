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
 * Moves open conversations to "pending" once WhatsApp's 24h free-form
 * messaging window closes (no inbound message in the last 24h). They reopen
 * automatically when the contact messages back (InboundMessageService).
 */
class ExpireConversationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $expired = Conversation::where('status', 'open')
            ->where(function ($q) {
                $q->whereHas('messages', fn ($m) => $m->where('direction', 'in'))
                    ->whereDoesntHave('messages', fn ($m) => $m->where('direction', 'in')->where('created_at', '>=', now()->subHours(24)));

                $q->orWhere(function ($q2) {
                    $q2->whereDoesntHave('messages', fn ($m) => $m->where('direction', 'in'))
                        ->where('created_at', '<=', now()->subHours(24));
                });
            })
            ->get();

        if ($expired->isEmpty()) {
            return;
        }

        Conversation::whereIn('id', $expired->pluck('id'))->update(['status' => 'pending']);

        foreach ($expired as $conversation) {
            $conversation->status = 'pending';
            event(new ConversationUpdatedEvent($conversation));
        }

        Log::info('[ExpireConversations] moved to pending after 24h window', ['count' => $expired->count()]);
    }
}
