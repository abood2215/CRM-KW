<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'chatwoot_conv_id' => $this->chatwoot_conv_id,
            'status' => $this->status,
            'source' => $this->source,
            // Structural fix for the old app's bug: campaign conversations were
            // visually identical to real inbound customer conversations.
            'is_campaign_origin' => $this->is_campaign_origin,
            'last_message' => $this->last_message,
            'last_message_at' => $this->last_message_at?->toISOString(),
            'unread_count' => $this->unread_count,
            'contact' => new ContactResource($this->whenLoaded('contact')),
            'assigned_user' => new UserResource($this->whenLoaded('assignedUser')),
            'messages_count' => $this->whenCounted('messages'),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
