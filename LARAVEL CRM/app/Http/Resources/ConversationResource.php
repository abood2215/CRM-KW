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
            'last_message' => $this->last_message,
            'last_message_at' => $this->last_message_at?->toISOString(),
            'unread_count' => $this->unread_count,
            'source' => $this->source,
            'client' => new ClientResource($this->whenLoaded('client')),
            'assigned_user' => new UserResource($this->whenLoaded('assignedUser')),
            'messages_count' => $this->whenCounted('messages'),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
