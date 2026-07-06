<?php

namespace App\Services\Whatsapp;

use App\Models\WhatsappNumber;
use App\Models\WhatsappTemplate;

class TemplateSyncService
{
    public function sync(WhatsappNumber $number): int
    {
        if (! $number->isCloud() || ! $number->access_token || ! $number->phone_number_id || ! $number->business_account_id) {
            throw new \RuntimeException('هذا الرقم لا يدعم Cloud API. أضف access_token و phone_number_id و business_account_id.');
        }

        $sender = new CloudApiWhatsAppSender($number->access_token, $number->phone_number_id);
        $apiTemplates = $sender->getTemplates($number->business_account_id);

        $synced = 0;

        foreach ($apiTemplates as $tpl) {
            $headerType = 'none';
            $headerContent = null;
            $bodyText = '';
            $footerText = null;
            $buttons = null;
            $variablesCount = 0;

            foreach ($tpl['components'] ?? [] as $component) {
                switch ($component['type']) {
                    case 'HEADER':
                        $headerType = strtolower($component['format'] ?? 'text');
                        $headerContent = $component['text'] ?? null;
                        break;
                    case 'BODY':
                        $bodyText = $component['text'] ?? '';
                        preg_match_all('/\{\{\d+\}\}/', $bodyText, $matches);
                        $variablesCount = count($matches[0]);
                        break;
                    case 'FOOTER':
                        $footerText = $component['text'] ?? null;
                        break;
                    case 'BUTTONS':
                        $buttons = $component['buttons'] ?? null;
                        break;
                }
            }

            WhatsappTemplate::updateOrCreate(
                ['whatsapp_number_id' => $number->id, 'name' => $tpl['name']],
                [
                    'language' => $tpl['language'] ?? 'ar',
                    'category' => strtolower($tpl['category'] ?? 'marketing'),
                    'status' => strtolower($tpl['status'] ?? 'pending'),
                    'header_type' => $headerType,
                    'header_content' => $headerContent,
                    'body_text' => $bodyText,
                    'footer_text' => $footerText,
                    'buttons' => $buttons,
                    'variables_count' => $variablesCount,
                    'last_synced_at' => now(),
                ]
            );

            $synced++;
        }

        return $synced;
    }
}
