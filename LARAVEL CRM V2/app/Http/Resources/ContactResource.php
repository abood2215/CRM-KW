<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'source' => $this->source,
            'tags' => $this->tags,
            'service' => $this->service,
            'budget' => $this->budget,
            'pipeline_stage' => $this->pipeline_stage?->value,
            'pipeline_stage_label' => $this->pipeline_stage?->label(),
            'notes' => $this->notes,
            'opt_in' => $this->opt_in,
            'opt_out' => $this->opt_out,
            'is_blacklisted' => $this->is_blacklisted,
            'blacklisted_until' => $this->blacklisted_until?->toISOString(),
            'user' => new UserResource($this->whenLoaded('user')),
            'tasks_count' => $this->whenCounted('tasks'),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
