<?php

namespace App\Http\Requests\Contact;

use App\ValueObjects\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // See StoreContactRequest — the `unique` check must compare the normalized
        // value, since that's what's actually stored in `contacts.phone`.
        if ($this->has('phone')) {
            $this->merge(['phone' => PhoneNumber::normalize($this->input('phone'))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'phone' => ['sometimes', 'string', 'max:20', Rule::unique('contacts', 'phone')->ignore($this->route('contact'))],
            'email' => 'nullable|email|max:255',
            'source' => 'sometimes|in:whatsapp,instagram,referral,google',
            'service' => 'nullable|string|max:255',
            'budget' => 'nullable|numeric|min:0',
            'pipeline_stage' => 'sometimes|nullable|in:new,contacted,interested,booked,active,following',
            'notes' => 'nullable|string',
            'user_id' => 'nullable|exists:users,id',
        ];
    }
}
