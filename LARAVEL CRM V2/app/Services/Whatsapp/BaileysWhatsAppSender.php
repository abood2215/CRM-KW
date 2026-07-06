<?php

namespace App\Services\Whatsapp;

use App\Services\Whatsapp\Contracts\WhatsAppSenderInterface;
use Illuminate\Support\Facades\Http;

/**
 * WhatsApp Web (QR/session-based, via a Baileys sidecar service) sender —
 * an alternate implementation of the same WhatsAppSenderInterface as
 * CloudApiWhatsAppSender. Templates aren't a WhatsApp Web concept, so
 * sendTemplate() has no real equivalent here.
 */
class BaileysWhatsAppSender implements WhatsAppSenderInterface
{
    private string $baseUrl;

    public function __construct(private readonly string $sessionName)
    {
        $this->baseUrl = config('services.baileys.base_url', 'http://localhost:3001');
    }

    public function sendMessage(string $to, string $body): array
    {
        return $this->request()->post("/api/{$this->sessionName}/send-message", [
            'phone' => $this->formatPhone($to),
            'message' => $body,
        ])->json() ?? [];
    }

    public function sendTemplate(string $to, string $templateName, string $language, array $components = []): array
    {
        throw new \RuntimeException('Baileys (WhatsApp Web) does not support template messages — use a Cloud API number for template sends.');
    }

    public function sendImage(string $to, string $imageUrl, ?string $caption = null): array
    {
        return $this->request()->post("/api/{$this->sessionName}/send-image", [
            'phone' => $this->formatPhone($to),
            'image' => $imageUrl,
            'caption' => $caption,
        ])->json() ?? [];
    }

    public function getStatus(): array
    {
        return $this->request()->get("/api/{$this->sessionName}/status")->json() ?? [];
    }

    public function getQr(): array
    {
        return $this->request()->get("/api/{$this->sessionName}/qr")->json() ?? [];
    }

    private function request()
    {
        return Http::baseUrl($this->baseUrl)->timeout(30)->withHeaders(['Content-Type' => 'application/json']);
    }

    private function formatPhone(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($phone, '0')) {
            $phone = '965'.substr($phone, 1);
        }

        return $phone.'@s.whatsapp.net';
    }
}
