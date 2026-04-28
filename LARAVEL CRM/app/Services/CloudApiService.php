<?php
namespace App\Services;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CloudApiService
{
    public function sendMessage(string $phoneNumberId, string $accessToken, string $to, string $message): array
    {
        $to = preg_replace('/[^0-9]/', '', $to);
        if (str_starts_with($to, '0')) {
            $to = '965' . substr($to, 1);
        }
        if (!str_starts_with($to, '965')) {
            $to = '965' . $to;
        }

        $response = Http::withToken($accessToken)
            ->post("https://graph.facebook.com/v25.0/{$phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'text',
                'text' => ['body' => $message],
            ]);

        if (!$response->successful()) {
            Log::error('WhatsApp Cloud API Error: ' . $response->body());
        }

        return $response->json() ?? [];
    }

    public function sendTemplate(string $phoneNumberId, string $accessToken, string $to, string $templateName, array $params = [], string $lang = 'ar'): array
    {
        $to = preg_replace('/[^0-9]/', '', $to);
        if (!str_starts_with($to, '965')) {
            $to = '965' . $to;
        }

        $components = [];
        if (!empty($params)) {
            $components[] = [
                'type' => 'body',
                'parameters' => array_map(fn($p) => ['type' => 'text', 'text' => $p], $params),
            ];
        }

        $response = Http::withToken($accessToken)
            ->post("https://graph.facebook.com/v25.0/{$phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'template',
                'template' => [
                    'name' => $templateName,
                    'language' => ['code' => $lang],
                    'components' => $components,
                ],
            ]);

        if (!$response->successful()) {
            Log::error('WhatsApp Cloud API Template Error: ' . $response->body());
        }

        return $response->json() ?? [];
    }
}
