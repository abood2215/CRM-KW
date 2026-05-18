<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'               => 'required|string|max:255',
            'description'        => 'nullable|string',
            'whatsapp_number_id' => 'nullable|exists:whatsapp_numbers,id',
            'contact_list_id'    => 'nullable|exists:contact_lists,id',

            // Template-based sending (Cloud API outbound — required for cold contacts)
            'template_name'      => 'nullable|string|max:255',
            'template_language'  => 'nullable|string|max:10',
            'template_variables' => 'nullable|array',

            // Fallback for 24h window (existing conversations only)
            'message_text'       => 'nullable|string',
            'image_path'         => 'nullable|string',

            'scheduled_at'       => 'nullable|date|after:now',

            'delay_seconds'      => 'sometimes|integer|min:1|max:3600',

            // Stop the campaign if fail rate exceeds this percentage
            'stop_on_fail_rate'  => 'sometimes|integer|min:1|max:100',

            // Explicit recipient list (overrides contact_list_id if both provided)
            'recipients'              => 'nullable|array',
            'recipients.*.phone'      => 'required_with:recipients|string',
            'recipients.*.name'       => 'nullable|string',
            'recipients.*.variables'  => 'nullable|array',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $hasRecipients   = !empty($this->recipients);
            $hasContactList  = !empty($this->contact_list_id);
            $hasTemplate     = !empty($this->template_name);
            $hasMessage      = !empty($this->message_text);

            if (!$hasRecipients && !$hasContactList) {
                $v->errors()->add('recipients', 'يجب تحديد قائمة مستلمين أو اختيار قائمة جهات اتصال.');
            }

            if (!$hasTemplate && !$hasMessage) {
                $v->errors()->add('template_name', 'يجب تحديد قالب رسالة أو نص رسالة.');
            }
        });
    }
}
