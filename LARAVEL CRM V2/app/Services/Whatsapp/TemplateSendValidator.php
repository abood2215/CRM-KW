<?php

namespace App\Services\Whatsapp;

use App\Models\WhatsappTemplate;

/**
 * Meta rejects a template send with the opaque 132012 "Parameter format does not match
 * format in the created template" whenever the components sent don't match what the
 * approved template actually requires — most commonly a missing header image because
 * WhatsappTemplate::header_content was never populated for a template synced from Meta.
 * This catches that before the call, so the failure reason is legible instead of a Meta
 * error code someone has to look up.
 */
class TemplateSendValidator
{
    /** @throws \RuntimeException when the template's approved shape can't be satisfied by what's available */
    public static function assertSendable(WhatsappTemplate $template, ?string $headerImageUrl, array $variables): void
    {
        if (in_array($template->header_type, ['image', 'video', 'document'], true) && ! $headerImageUrl) {
            throw new \RuntimeException(
                "القالب \"{$template->name}\" يتطلب هيدر ({$template->header_type}) ولم يتم رفعه بعد — ارفعه من صفحة القوالب قبل الإرسال."
            );
        }

        if ($template->variables_count > count($variables)) {
            throw new \RuntimeException(
                "القالب \"{$template->name}\" يتطلب {$template->variables_count} متغيرات، تم توفير ".count($variables)." فقط."
            );
        }
    }
}
