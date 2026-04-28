<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'chatwoot_message_id' => $this->chatwoot_message_id,
            'whatsapp_message_id' => $this->whatsapp_message_id,
            'content' => $this->content,
            'type' => $this->type,
            'direction' => $this->direction,
            'is_private' => $this->is_private,
            'sender_name' => $this->sender_name,
            'status' => $this->status,
            'sent_at' => $this->sent_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
