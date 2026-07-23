<?php

namespace App\Services\Whatsapp;

use App\Models\WhatsappTemplate;
use App\Services\Whatsapp\Contracts\WhatsAppSenderInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Resolves which media file backs a template's image/video/document header for a single send,
 * and builds the Meta header component for it. An agent can attach a file directly in the send
 * form (a per-send override); otherwise the template's stored default (header_content, attached
 * by an admin on the templates page) is used. Shared by the one-off conversation send and the
 * new-conversation send so header behavior can't drift between the two call sites — the same
 * reason HeaderMediaResolver exists for the media-id caching layer underneath this.
 */
class TemplateHeaderResolver
{
    public const MEDIA_HEADER_TYPES = ['image', 'video', 'document'];

    /**
     * Per-type upload rules matching Meta's own size caps for header media
     * (image 5MB, video 16MB, document 100MB) and the formats Meta accepts.
     */
    private const UPLOAD_RULES = [
        'image' => 'file|mimes:jpeg,jpg,png,webp|max:5120',
        'video' => 'file|mimetypes:video/mp4,video/3gpp|max:16384',
        'document' => 'file|mimes:pdf|max:102400',
    ];

    /** Meta's Media API requires the real MIME type — `link`-stored defaults only carry an extension. */
    private const EXTENSION_MIME_TYPES = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        'mp4' => 'video/mp4',
        '3gp' => 'video/3gpp',
        'pdf' => 'application/pdf',
    ];

    public static function uploadRuleFor(string $headerType): string
    {
        return self::UPLOAD_RULES[$headerType] ?? 'file';
    }

    /**
     * Stores a per-send file (when the agent attached one) and returns the effective header URL,
     * falling back to the template's stored default. `isOverride` tells buildComponent() not to
     * touch the template's cached media id for a one-shot file.
     *
     * @return array{url: ?string, isOverride: bool}
     */
    public function resolveUrl(WhatsappTemplate $template, ?UploadedFile $file): array
    {
        if ($file) {
            // Same disk + directory the template editor's uploadImage endpoint uses, so all
            // header media lives in one place regardless of which flow uploaded it.
            $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
            $path = $file->storeAs('template-images', $fileName, 'public');

            return ['url' => Storage::disk('public')->url($path), 'isOverride' => true];
        }

        return ['url' => $template->header_content, 'isOverride' => false];
    }

    /** Builds the Meta header component for an image/video/document header template. */
    public function buildComponent(WhatsappTemplate $template, string $url, bool $isOverride, WhatsAppSenderInterface $sender): array
    {
        $type = $template->header_type;

        $media = $sender instanceof CloudApiWhatsAppSender
            ? (new HeaderMediaResolver())->resolve(
                // A per-send override is one-shot: never reuse the template's cached id for it,
                // and never persist its id — that would poison header_media_id and make every
                // later default send deliver this send's file instead of the template's own.
                $isOverride ? null : $template->header_media_id,
                $url,
                $sender,
                $isOverride ? static fn () => null : fn ($mediaId) => $template->update(['header_media_id' => $mediaId]),
                self::mimeTypeFromUrl($url),
            )
            : ['link' => $url];

        return [
            'type' => 'header',
            'parameters' => [['type' => $type, $type => $media]],
        ];
    }

    private static function mimeTypeFromUrl(string $url): string
    {
        $extension = strtolower(pathinfo(parse_url($url, PHP_URL_PATH) ?: '', PATHINFO_EXTENSION));

        return self::EXTENSION_MIME_TYPES[$extension] ?? 'image/jpeg';
    }
}
