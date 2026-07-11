<?php

namespace App\Http\Requests\Contact;

use App\ValueObjects\PhoneNumber;
use Illuminate\Foundation\Http\FormRequest;

class StoreContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // The `contacts.phone` column stores the normalized value (via Contact's phone
        // mutator) — normalizing here too keeps the `unique` check comparing like for
        // like, instead of a raw input format slipping past validation only to hit the
        // DB unique constraint directly as an uncaught QueryException.
        if ($this->has('phone')) {
            $this->merge(['phone' => PhoneNumber::normalize($this->input('phone'))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:contacts,phone',
            'email' => 'nullable|email|max:255',
            'source' => 'required|in:whatsapp,instagram,referral,google',
            'service' => 'nullable|string|max:255',
            'budget' => 'nullable|numeric|min:0',
            'pipeline_stage' => 'sometimes|nullable|in:new,contacted,interested,booked,active,following',
            'notes' => 'nullable|string',
            'user_id' => 'nullable|exists:users,id',
        ];
    }
}
