<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WhatsappTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'whatsapp_number_id' => $this->whatsapp_number_id,
            'meta_template_id' => $this->meta_template_id,
            'name' => $this->name,
            'language' => $this->language,
            'category' => $this->category,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'header_type' => $this->header_type,
            'header_content' => $this->header_content,
            'body_text' => $this->body_text,
            'footer_text' => $this->footer_text,
            'buttons' => $this->buttons,
            'variables_count' => $this->variables_count,
            'last_synced_at' => $this->last_synced_at?->toISOString(),
            'whatsapp_number' => new WhatsappNumberResource($this->whenLoaded('whatsappNumber')),
        ];
    }
}
