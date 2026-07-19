<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DripSequenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'whatsapp_number_id' => $this->whatsapp_number_id,
            'steps' => DripSequenceStepResource::collection($this->whenLoaded('steps')),
            'steps_count' => $this->whenCounted('steps'),
            'active_enrollments_count' => $this->when(isset($this->active_enrollments_count), (int) $this->active_enrollments_count),
            'completed_enrollments_count' => $this->when(isset($this->completed_enrollments_count), (int) $this->completed_enrollments_count),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
