<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($this->route('id'))],
            'password' => 'sometimes|string|min:8',
            'role' => 'sometimes|in:admin,manager,agent',
            'phone' => 'nullable|string|max:20',
            'avatar' => 'nullable|image|max:2048',
            'is_active' => 'sometimes|boolean',
        ];
    }
}
