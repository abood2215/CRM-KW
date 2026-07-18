<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WhatsappNumberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'session_name' => $this->session_name,
            'phone_number_id' => $this->phone_number_id,
            'business_account_id' => $this->business_account_id,
            'api_type' => $this->api_type,
            'status' => $this->status,
            'quality_rating' => $this->quality_rating,
            'quality_checked_at' => $this->quality_checked_at?->toISOString(),
            'daily_limit' => $this->daily_limit,
            'sent_today' => $this->sent_today,
            'can_send' => $this->canSend(),
            'last_sent_at' => $this->last_sent_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
