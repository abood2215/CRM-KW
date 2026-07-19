<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DripEnrollmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'contact' => new ContactResource($this->whenLoaded('contact')),
            'enrolled_at' => $this->enrolled_at?->toISOString(),
            'current_step' => $this->current_step,
            'status' => $this->status,
            'next_send_at' => $this->next_send_at?->toISOString(),
        ];
    }
}
