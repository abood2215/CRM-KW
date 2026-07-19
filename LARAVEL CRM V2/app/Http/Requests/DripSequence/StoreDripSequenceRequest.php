<?php

namespace App\Http\Requests\DripSequence;

use Illuminate\Foundation\Http\FormRequest;

class StoreDripSequenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'whatsapp_number_id' => 'nullable|exists:whatsapp_numbers,id',
        ];
    }
}
