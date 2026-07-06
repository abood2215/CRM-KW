<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignRecipientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'phone' => $this->phone_snapshot,
            'name' => $this->name_snapshot,
            'status' => $this->status,
            'sent_at' => $this->sent_at?->toISOString(),
            'error_message' => $this->error_message,
        ];
    }
}
