<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:call,follow_up,send_offer,reminder',
            'priority' => 'sometimes|in:low,medium,high',
            'due_date' => 'nullable|date',
            'client_id' => 'nullable|exists:crm_clients,id',
            'user_id' => 'nullable|exists:users,id',
        ];
    }
}
