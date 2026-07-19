<?php

namespace App\Http\Requests\DripSequence;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDripSequenceRequest extends FormRequest
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
            'whatsapp_number_id' => 'nullable|exists:whatsapp_numbers,id',
            'status' => 'sometimes|in:active,paused',
        ];
    }
}
