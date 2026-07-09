<?php

namespace App\Http\Requests\WhatsappNumber;

use Illuminate\Foundation\Http\FormRequest;

class StoreWhatsappNumberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('whatsapp_numbers.manage');
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:whatsapp_numbers,phone',
            'api_type' => 'sometimes|in:cloud,baileys',
            'session_name' => 'required_if:api_type,baileys|nullable|string|unique:whatsapp_numbers,session_name',
            'phone_number_id' => 'required_if:api_type,cloud|nullable|string',
            'access_token' => 'required_if:api_type,cloud|nullable|string',
            'business_account_id' => 'nullable|string',
            'daily_limit' => 'sometimes|integer|min:1|max:1000',
        ];
    }
}
