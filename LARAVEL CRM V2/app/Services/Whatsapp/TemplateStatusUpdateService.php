<?php

namespace App\Services\Whatsapp;

use App\Models\WhatsappTemplate;
use App\Services\Notifications\NotificationService;
use Illuminate\Support\Facades\Log;

/**
 * Handles Meta's message_template_status_update webhook (fired when a template is
 * approved/rejected/paused/disabled) so the local status stays in sync without waiting
 * for the manual/6-hourly pull-based sync in TemplateSyncService.
 */
class TemplateStatusUpdateService
{
    private const STATUS_MAP = [
        'APPROVED' => 'approved',
        'REJECTED' => 'rejected',
        'PAUSED' => 'paused',
        'DISABLED' => 'disabled',
        'PENDING' => 'pending',
        'IN_APPEAL' => 'pending',
        'PENDING_DELETION' => 'pending',
    ];

    public function handle(array $value): void
    {
        $event = $value['event'] ?? null;
        $metaTemplateId = isset($value['message_template_id']) ? (string) $value['message_template_id'] : null;
        $name = $value['message_template_name'] ?? null;
        $language = $value['message_template_language'] ?? null;

        if (! $event || (! $metaTemplateId && ! $name)) {
            return;
        }

        $status = self::STATUS_MAP[$event] ?? null;
        if (! $status) {
            Log::warning('[TemplateStatusUpdate] unrecognized event', ['event' => $event]);

            return;
        }

        $template = $metaTemplateId
            ? WhatsappTemplate::where('meta_template_id', $metaTemplateId)->first()
            : null;

        if (! $template && $name) {
            $template = WhatsappTemplate::where('name', $name)
                ->when($language, fn ($q) => $q->where('language', $language))
                ->first();
        }

        if (! $template) {
            Log::warning('[TemplateStatusUpdate] no matching local template', ['meta_template_id' => $metaTemplateId, 'name' => $name]);

            return;
        }

        $reason = $value['reason'] ?? null;
        $reason = ($reason && $reason !== 'NONE') ? $reason : null;

        $template->update([
            'status' => $status,
            'rejection_reason' => $status === 'rejected' ? $reason : null,
            'meta_template_id' => $template->meta_template_id ?? $metaTemplateId,
        ]);

        if (in_array($status, ['rejected', 'paused', 'disabled'], true)) {
            $label = ['rejected' => 'مرفوض', 'paused' => 'موقوف مؤقتاً', 'disabled' => 'معطّل'][$status];

            NotificationService::sendToAdmins(
                'whatsapp_template_status',
                'تنبيه: تغيّرت حالة قالب واتساب',
                "القالب \"{$template->name}\" أصبح {$label} من ميتا".($reason ? " — السبب: {$reason}" : '.'),
                ['template_id' => $template->id, 'status' => $status],
            );
        }
    }
}
