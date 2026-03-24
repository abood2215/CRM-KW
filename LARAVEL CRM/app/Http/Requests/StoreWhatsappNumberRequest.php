<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWhatsappNumberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:whatsapp_numbers,phone',
            'session_name' => 'required|string|unique:whatsapp_numbers,session_name',
            'daily_limit' => 'sometimes|integer|min:1|max:1000',
        ];
    }
}
