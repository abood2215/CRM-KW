<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Older template sends were stored without their header image. Use the local
        // template image as a display fallback while new sends persist media_url directly.
        $mediaUrl = $this->media_url;
        if (! $mediaUrl && $this->relationLoaded('whatsappTemplate')) {
            $mediaUrl = $this->whatsappTemplate?->header_content;
        }

        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'chatwoot_message_id' => $this->chatwoot_message_id,
            'whatsapp_message_id' => $this->whatsapp_message_id,
            'sender_number' => $this->whenLoaded('whatsappNumber', fn () => $this->whatsappNumber?->phone),
            'content' => $this->content,
            'media_url' => $mediaUrl,
            'type' => $this->type,
            'reaction_emoji' => $this->reaction_emoji,
            'direction' => $this->direction,
            'is_private' => $this->is_private,
            'sender_name' => $this->sender_name,
            'status' => $this->status,
            'error_message' => $this->error_message,
            'sent_at' => $this->sent_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
