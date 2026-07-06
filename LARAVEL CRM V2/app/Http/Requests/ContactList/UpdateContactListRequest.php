<?php

namespace App\Http\Requests\ContactList;

use Illuminate\Foundation\Http\FormRequest;

class UpdateContactListRequest extends FormRequest
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
        ];
    }
}
