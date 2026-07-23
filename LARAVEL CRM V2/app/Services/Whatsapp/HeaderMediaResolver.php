<?php

namespace App\Services\Whatsapp;

use Illuminate\Support\Facades\Log;

/**
 * Single source of truth for turning a template/campaign header image into the parameter Meta
 * expects — used by both the one-off conversation send and the campaign job so the caching
 * behavior can't drift between the two call sites. Prefers a previously-cached media id;
 * uploads once and hands the id back to the caller to persist so every later send reuses it
 * instead of re-sending the image by `link` (which Meta re-fetches from our server on every
 * single send and flags as non-compliant once a template fans out to many recipients).
 */
class HeaderMediaResolver
{
    /** @param callable(string $mediaId): void $onUploaded */
    public function resolve(?string $cachedMediaId, string $imageUrl, CloudApiWhatsAppSender $sender, callable $onUploaded, ?string $mimeType = null): array
    {
        if ($cachedMediaId) {
            return ['id' => $cachedMediaId];
        }

        $mediaId = $mimeType ? $sender->uploadMedia($imageUrl, $mimeType) : $sender->uploadMedia($imageUrl);

        if ($mediaId) {
            $onUploaded($mediaId);

            return ['id' => $mediaId];
        }

        Log::warning('[HeaderMediaResolver] upload failed, falling back to link', ['url' => $imageUrl]);

        return ['link' => $imageUrl];
    }
}
