<?php

namespace App\Services\Conversations;

use App\Models\Contact;
use App\Models\Conversation;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ConversationService
{
    /** Finds this contact's open WhatsApp conversation, reopens their latest one, or creates a new one. */
    public function resolveForContact(Contact $contact): Conversation
    {
        $lock = Cache::lock('conv-resolve-'.$contact->id, 15);
        $lock->block(10);

        try {
            return $this->resolveLocked($contact);
        } finally {
            $lock->release();
        }
    }

    private function resolveLocked(Contact $contact): Conversation
    {
        return DB::transaction(function () use ($contact) {
            $openConversations = Conversation::where('source', 'whatsapp')
                ->where('status', 'open')
                ->where('contact_id', $contact->id)
                ->lockForUpdate()
                ->orderBy('id')
                ->get();

            if ($openConversations->isNotEmpty()) {
                $conversation = $openConversations->first();

                if ($openConversations->count() > 1) {
                    Conversation::whereIn('id', $openConversations->skip(1)->pluck('id'))
                        ->update(['status' => 'resolved']);
                }

                return $conversation;
            }

            $conversation = Conversation::where('source', 'whatsapp')
                ->where('contact_id', $contact->id)
                ->lockForUpdate()
                ->orderByDesc('id')
                ->first();

            if ($conversation) {
                $conversation->update(['status' => 'open']);
                Log::info('[ConversationService] reopened conversation', ['conversation_id' => $conversation->id]);

                return $conversation;
            }

            $conversation = Conversation::create([
                'contact_id' => $contact->id,
                'status' => 'open',
                'source' => 'whatsapp',
                'unread_count' => 0,
            ]);

            Log::info('[ConversationService] created new conversation', ['conversation_id' => $conversation->id]);

            return $conversation;
        });
    }

    /** Used by the campaign job: record an outbound send as a conversation message, tagged as campaign-originated. */
    public function recordOutboundMessage(Conversation $conversation, string $content, ?string $waMessageId, string $senderName, ?string $mediaUrl = null): void
    {
        \App\Models\Message::create([
            'conversation_id' => $conversation->id,
            'whatsapp_message_id' => $waMessageId,
            'content' => $content,
            'media_url' => $mediaUrl,
            'type' => 'text',
            'direction' => 'out',
            'is_private' => false,
            'sender_name' => $senderName,
            'status' => $waMessageId ? 'sent' : null,
            'sent_at' => now(),
        ]);

        $conversation->update([
            'last_message' => $content,
            'last_message_at' => now(),
        ]);
    }
}
