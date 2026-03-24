<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'message_text' => 'required|string',
            'image_path' => 'nullable|string',
            'scheduled_at' => 'nullable|date|after:now',
            'delay_seconds' => 'sometimes|integer|min:1|max:60',
            'recipients' => 'required|array|min:1',
            'recipients.*.phone' => 'required|string',
            'recipients.*.name' => 'nullable|string',
        ];
    }
}
