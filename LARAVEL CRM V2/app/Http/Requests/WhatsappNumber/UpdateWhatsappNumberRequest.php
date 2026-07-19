<?php

namespace App\Http\Requests\WhatsappNumber;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWhatsappNumberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('whatsapp_numbers.manage');
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            // Meta's own messaging tiers scale up to 100k/unlimited conversations per 24h —
            // 1000 was an arbitrary starter cap that real high-volume numbers already exceed.
            'daily_limit' => 'sometimes|integer|min:1|max:1000000',
            'access_token' => 'sometimes|nullable|string',
            'phone_number_id' => 'sometimes|nullable|string',
            'business_account_id' => 'sometimes|nullable|string',
        ];
    }
}
