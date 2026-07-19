<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_name' => $this->contact?->name ?? $this->customer_name,
            'customer_phone' => $this->contact?->phone ?? $this->customer_phone,
            'service' => $this->service,
            'starts_at' => $this->starts_at?->toISOString(),
            'duration_minutes' => $this->duration_minutes,
            'status' => $this->status,
            'source' => $this->source,
            'notes' => $this->notes,
            'reminder_sent_at' => $this->reminder_sent_at?->toISOString(),
            'contact' => new ContactResource($this->whenLoaded('contact')),
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
