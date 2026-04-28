<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'source' => 'required|in:whatsapp,instagram,referral,google',
            'service' => 'nullable|string|max:255',
            'budget' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:new,contacted,interested,booked,active,following',
            'notes' => 'nullable|string',
            'user_id' => 'nullable|exists:users,id',
        ];
    }
}
