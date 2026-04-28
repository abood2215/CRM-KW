<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class BaileysService
{
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.baileys.base_url', 'http://localhost:3001');
    }

    protected function request()
    {
        return Http::baseUrl($this->baseUrl)
            ->timeout(30)
            ->withHeaders([
                'Content-Type' => 'application/json',
            ]);
    }

    public function sendMessage(string $sessionName, string $phone, string $message): array
    {
        $response = $this->request()->post("/api/{$sessionName}/send-message", [
            'phone' => $this->formatPhone($phone),
            'message' => $message,
        ]);
        return $response->json() ?? [];
    }

    public function sendImage(string $sessionName, string $phone, string $imageUrl, ?string $caption = null): array
    {
        $response = $this->request()->post("/api/{$sessionName}/send-image", [
            'phone' => $this->formatPhone($phone),
            'image' => $imageUrl,
            'caption' => $caption,
        ]);
        return $response->json() ?? [];
    }

    public function getStatus(string $sessionName): array
    {
        $response = $this->request()->get("/api/{$sessionName}/status");
        return $response->json() ?? [];
    }

    public function getQR(string $sessionName): array
    {
        $response = $this->request()->get("/api/{$sessionName}/qr");
        return $response->json() ?? [];
    }

    protected function formatPhone(string $phone): string
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($phone, '0')) {
            $phone = '962' . substr($phone, 1);
        }
        return $phone . '@s.whatsapp.net';
    }
}
