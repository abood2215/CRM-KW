<?php

namespace App\Http\Requests\Appointment;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
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
            'service' => 'required|string|max:255',
            'starts_at' => 'required|date',
            'duration_minutes' => 'sometimes|integer|min:15|max:480',
            'notes' => 'nullable|string',
        ];
    }
}
