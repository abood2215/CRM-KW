<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'is_system' => $this->is_system,
            'users_count' => $this->whenCounted('users'),
            'permission_keys' => $this->whenLoaded('permissions', fn () => $this->permissions->pluck('key')),
        ];
    }
}
