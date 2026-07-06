<?php

namespace App\Services\Conversations;

use App\Models\Campaign;
use App\Models\Contact;
use App\Models\Conversation;

/**
 * Links a successful campaign send into the contact's conversation inbox,
 * flagging the conversation as campaign-originated. Fixes the old app's bug
 * where campaign-originated conversations were indistinguishable from real
 * inbound customer conversations in the inbox.
 */
class CampaignConversationSync
{
    public function __construct(private readonly ConversationService $conversations)
    {
    }

    public function recordSend(Contact $contact, Campaign $campaign, string $content, ?string $waMessageId): void
    {
        $wasNew = ! Conversation::where('contact_id', $contact->id)->where('source', 'whatsapp')->exists();

        $conversation = $this->conversations->resolveForContact($contact);

        if ($wasNew) {
            $conversation->update(['is_campaign_origin' => true]);
        }

        $this->conversations->recordOutboundMessage($conversation, $content, $waMessageId, $campaign->name);
    }
}
