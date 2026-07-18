<?php

namespace App\Services\Whatsapp\Contracts;

/**
 * Single source of truth for "send a WhatsApp message" — the old app had two
 * independent send paths (Cloud API + Baileys) with divergent phone formatting
 * and error handling. Every send path implements this same contract.
 */
interface WhatsAppSenderInterface
{
    public function sendMessage(string $to, string $body): array;

    public function sendTemplate(string $to, string $templateName, string $language, array $components = []): array;

    public function sendImage(string $to, string $imageUrl, ?string $caption = null): array;

    public function sendVideo(string $to, string $videoUrl, ?string $caption = null): array;

    public function sendDocument(string $to, string $documentUrl, ?string $filename = null): array;

    public function sendAudio(string $to, string $audioUrl): array;
}
