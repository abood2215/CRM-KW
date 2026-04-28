<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'source' => $this->source,
            'service' => $this->service,
            'budget' => $this->budget,
            'status' => $this->status,
            'status_label' => match ($this->status) {
                'new'       => 'جديد',
                'contacted' => 'تم التواصل',
                'interested'=> 'مهتم',
                'booked'    => 'محجوز',
                'active'    => 'نشط',
                'following' => 'متابعة',
                default     => $this->status,
            },
            'notes' => $this->notes,
            'user' => new UserResource($this->whenLoaded('user')),
            'tasks_count' => $this->whenCounted('tasks'),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
