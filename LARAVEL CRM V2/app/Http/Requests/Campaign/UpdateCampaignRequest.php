<?php

namespace App\Http\Requests\Campaign;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'whatsapp_number_id' => 'sometimes|exists:whatsapp_numbers,id',
            'template_name' => 'sometimes|string',
            'template_language' => 'sometimes|string',
            'template_variables' => 'nullable|array',
            'contact_list_id' => 'nullable|exists:contact_lists,id',
            'scheduled_at' => 'nullable|date|after:now',
            'delay_seconds' => 'sometimes|integer|min:1|max:3600',
            'stop_on_fail_rate' => 'sometimes|integer|min:1|max:100',
        ];
    }
}
