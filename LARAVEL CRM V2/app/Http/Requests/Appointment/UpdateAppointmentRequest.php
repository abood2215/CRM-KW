<?php

namespace App\Http\Requests\Appointment;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'contact_id' => 'nullable|exists:contacts,id',
            'user_id' => 'nullable|exists:users,id',
            'service' => 'sometimes|string|max:255',
            'starts_at' => 'sometimes|date',
            'duration_minutes' => 'sometimes|integer|min:15|max:480',
            'status' => 'sometimes|in:pending,confirmed,completed,cancelled,no_show',
            'notes' => 'nullable|string',
        ];
    }
}
