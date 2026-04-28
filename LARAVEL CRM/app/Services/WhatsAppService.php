<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected string $accessToken;
    protected string $phoneNumberId;
    protected string $apiVersion;
    protected string $baseUrl = 'https://graph.facebook.com';

    // يقبل اختيارياً token و phoneNumberId مباشرة (للأرقام المتعددة)
    // وإلا يقرأ من config (للرقم الافتراضي)
    public function __construct(
        ?string $accessToken   = null,
        ?string $phoneNumberId = null
    ) {
        $this->accessToken   = $accessToken   ?? config('services.whatsapp.access_token', '');
        $this->phoneNumberId = $phoneNumberId ?? config('services.whatsapp.phone_number_id', '');
        $this->apiVersion    = config('services.whatsapp.api_version', 'v19.0');
    }

    /**
     * Send a plain text message.
     */
    public function sendMessage(string $to, string $body, ?string $phoneNumberId = null): array
    {
        Log::info('[WhatsApp] sendMessage', [
            'to'              => $to,
            'phone_number_id' => $phoneNumberId ?? $this->phoneNumberId,
        ]);

        return $this->send([
            'messaging_product' => 'whatsapp',
            'recipient_type'    => 'individual',
            'to'                => $this->formatPhone($to),
            'type'              => 'text',
            'text'              => [
                'preview_url' => false,
                'body'        => $body,
            ],
        ], $phoneNumberId);
    }

    /**
     * Send a template message.
     */
    public function sendTemplate(
        string $to,
        string $templateName,
        string $language = 'ar',
        array $components = [],
        ?string $phoneNumberId = null
    ): array {
        Log::info('[WhatsApp] sendTemplate', [
            'to'              => $to,
            'template'        => $templateName,
            'language'        => $language,
            'phone_number_id' => $phoneNumberId ?? $this->phoneNumberId,
        ]);

        return $this->send([
            'messaging_product' => 'whatsapp',
            'to'                => $this->formatPhone($to),
            'type'              => 'template',
            'template'          => [
                'name'       => $templateName,
                'language'   => ['code' => $language],
                'components' => $components,
            ],
        ], $phoneNumberId);
    }

    /**
     * Send an image message.
     */
    public function sendImage(
        string $to,
        string $imageUrl,
        ?string $caption = null,
        ?string $phoneNumberId = null
    ): array {
        Log::info('[WhatsApp] sendImage', [
            'to'              => $to,
            'image_url'       => $imageUrl,
            'phone_number_id' => $phoneNumberId ?? $this->phoneNumberId,
        ]);

        $image = ['link' => $imageUrl];
        if ($caption) {
            $image['caption'] = $caption;
        }

        return $this->send([
            'messaging_product' => 'whatsapp',
            'recipient_type'    => 'individual',
            'to'                => $this->formatPhone($to),
            'type'              => 'image',
            'image'             => $image,
        ], $phoneNumberId);
    }

    /**
     * Send payload to WhatsApp Cloud API with retry logic.
     */
    protected function send(array $payload, ?string $phoneNumberId = null, int $maxAttempts = 3): array
    {
        $phoneId = $phoneNumberId ?? $this->phoneNumberId;
        $url     = "{$this->baseUrl}/{$this->apiVersion}/{$phoneId}/messages";

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                Log::debug("[WhatsApp] Attempt {$attempt}/{$maxAttempts}", [
                    'url'     => $url,
                    'payload' => $payload,
                ]);

                $response = Http::withToken($this->accessToken)
                    ->timeout(30)
                    ->post($url, $payload);

                if ($response->successful()) {
                    $result = $response->json();
                    Log::info('[WhatsApp] Message sent successfully', ['response' => $result]);
                    return $result;
                }

                Log::warning("[WhatsApp] Attempt {$attempt} failed", [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);

            } catch (\Exception $e) {
                Log::warning("[WhatsApp] Attempt {$attempt} exception", [
                    'error' => $e->getMessage(),
                ]);
            }

            if ($attempt < $maxAttempts) {
                // Exponential backoff: 1s, 2s
                sleep(2 ** ($attempt - 1));
            }
        }

        Log::error('[WhatsApp] All attempts failed', ['payload' => $payload, 'phone_id' => $phoneId]);
        throw new \RuntimeException("WhatsApp message failed after {$maxAttempts} attempts.");
    }

    /**
     * Send a PDF document.
     */
    public function sendPDF(
        string $to,
        string $pdfUrl,
        string $filename = 'document.pdf',
        ?string $phoneNumberId = null
    ): array {
        return $this->send([
            'messaging_product' => 'whatsapp',
            'recipient_type'    => 'individual',
            'to'                => $this->formatPhone($to),
            'type'              => 'document',
            'document'          => [
                'link'     => $pdfUrl,
                'filename' => $filename,
            ],
        ], $phoneNumberId);
    }

    /**
     * جلب قوالب الحساب من Meta API.
     */
    public function getTemplates(?string $businessAccountId = null): array
    {
        // business_account_id مطلوب لجلب القوالب - يُمرر أو يُقرأ من config
        $accountId = $businessAccountId ?? config('services.whatsapp.business_account_id', '');

        if (empty($accountId)) {
            Log::warning('[WhatsApp] getTemplates: business_account_id غير محدد');
            return [];
        }

        $url = "{$this->baseUrl}/{$this->apiVersion}/{$accountId}/message_templates";

        try {
            $response = Http::withToken($this->accessToken)
                ->timeout(30)
                ->get($url, [
                    'fields' => 'name,language,category,status,components',
                    'limit'  => 200,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('[WhatsApp] getTemplates: جُلب ' . count($data['data'] ?? []) . ' قالب');
                return $data['data'] ?? [];
            }

            Log::warning('[WhatsApp] getTemplates فشل', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
        } catch (\Exception $e) {
            Log::error('[WhatsApp] getTemplates exception: ' . $e->getMessage());
        }

        return [];
    }

    /**
     * جلب حالة رقم الهاتف من Meta.
     */
    public function getPhoneNumberStatus(): array
    {
        $url = "{$this->baseUrl}/{$this->apiVersion}/{$this->phoneNumberId}";

        try {
            $response = Http::withToken($this->accessToken)
                ->timeout(15)
                ->get($url, ['fields' => 'display_phone_number,verified_name,quality_rating,status']);

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Exception $e) {
            Log::error('[WhatsApp] getPhoneNumberStatus: ' . $e->getMessage());
        }

        return [];
    }

    /**
     * Normalize phone number (remove non-digits, convert local to international).
     */
    protected function formatPhone(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (str_starts_with($phone, '0')) {
            $phone = '962' . substr($phone, 1);
        }

        return $phone;
    }
}
