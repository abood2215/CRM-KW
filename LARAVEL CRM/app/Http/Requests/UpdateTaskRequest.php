<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|in:call,follow_up,send_offer,reminder',
            'priority' => 'sometimes|in:low,medium,high',
            'due_date' => 'nullable|date',
            'status' => 'sometimes|in:pending,completed',
            'client_id' => 'nullable|exists:crm_clients,id',
            'user_id' => 'nullable|exists:users,id',
        ];
    }
}
