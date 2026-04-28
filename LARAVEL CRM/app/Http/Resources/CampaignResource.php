<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'message_text' => $this->message_text,
            'image_path' => $this->image_path,
            'status' => $this->status,
            'scheduled_at' => $this->scheduled_at?->toISOString(),
            'started_at' => $this->started_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'total_recipients' => $this->total_recipients,
            'sent_count' => $this->sent_count,
            'failed_count' => $this->failed_count,
            'reply_count' => $this->reply_count,
            'delay_seconds' => $this->delay_seconds,
            'progress_percentage' => $this->progress_percentage,
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
