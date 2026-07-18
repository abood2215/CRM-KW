<?php

namespace App\Services\Whatsapp;

use App\Services\Whatsapp\Contracts\WhatsAppSenderInterface;
use App\ValueObjects\PhoneNumber;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * WhatsApp Cloud API (Meta Graph) sender. Replaces the old app's WhatsAppService
 * + CloudApiService, which duplicated the same Graph API call with divergent
 * phone formatting and no shared retry/error-handling logic.
 */
class CloudApiWhatsAppSender implements WhatsAppSenderInterface
{
    private string $baseUrl = 'https://graph.facebook.com';

    private string $apiVersion;

    public function __construct(
        private readonly string $accessToken,
        private readonly string $phoneNumberId,
        ?string $apiVersion = null,
    ) {
        $this->apiVersion = $apiVersion ?? config('services.whatsapp.api_version', 'v21.0');
    }

    /** Meta error codes that will never succeed on retry. */
    private const NON_RETRYABLE_CODES = [
        131026, // user blocked the business account
        131047, // outside 24h re-engagement window — needs a template
        131000, // invalid WhatsApp number
        131001, // invalid phone number
        131005, // cannot verify number quality
        132000, // template name not found
        132001, // template not approved
    ];

    public function sendMessage(string $to, string $body): array
    {
        return $this->send([
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => PhoneNumber::normalize($to),
            'type' => 'text',
            'text' => ['preview_url' => false, 'body' => $body],
        ]);
    }

    public function sendTemplate(string $to, string $templateName, string $language, array $components = []): array
    {
        return $this->send([
            'messaging_product' => 'whatsapp',
            'to' => PhoneNumber::normalize($to),
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => ['code' => $language],
                'components' => $components,
            ],
        ]);
    }

    public function sendImage(string $to, string $imageUrl, ?string $caption = null): array
    {
        $image = ['link' => $imageUrl];
        if ($caption) {
            $image['caption'] = $caption;
        }

        return $this->send([
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => PhoneNumber::normalize($to),
            'type' => 'image',
            'image' => $image,
        ]);
    }

    /**
     * Submits a new template for Meta review. Not retried — template creation isn't
     * idempotent-safe to retry blindly (a transient network failure after Meta already
     * accepted the submission would create a duplicate on retry). Returns Meta's raw
     * response (id + status 'PENDING') on success; throws with Meta's own message on
     * rejection (e.g. missing "example" values for a {{n}} placeholder) so the caller
     * can surface the real reason instead of a generic failure.
     */
    public function createTemplate(string $businessAccountId, array $payload): array
    {
        $url = "{$this->baseUrl}/{$this->apiVersion}/{$businessAccountId}/message_templates";

        try {
            $response = Http::withToken($this->accessToken)->timeout(30)->post($url, $payload);

            if ($response->successful()) {
                return $response->json();
            }

            $errorMessage = $response->json('error.message') ?? $response->body();
            Log::warning('[CloudApiWhatsAppSender] createTemplate failed', ['status' => $response->status(), 'body' => $response->json()]);

            throw new \RuntimeException("رفضت ميتا القالب: {$errorMessage}");
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('[CloudApiWhatsAppSender] createTemplate exception: '.$e->getMessage());

            throw new \RuntimeException('تعذر الاتصال بميتا لإرسال القالب: '.$e->getMessage());
        }
    }

    public function sendVideo(string $to, string $videoUrl, ?string $caption = null): array
    {
        $video = ['link' => $videoUrl];
        if ($caption) {
            $video['caption'] = $caption;
        }

        return $this->send([
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => PhoneNumber::normalize($to),
            'type' => 'video',
            'video' => $video,
        ]);
    }

    public function sendDocument(string $to, string $documentUrl, ?string $filename = null): array
    {
        $document = ['link' => $documentUrl];
        if ($filename) {
            $document['filename'] = $filename;
        }

        return $this->send([
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => PhoneNumber::normalize($to),
            'type' => 'document',
            'document' => $document,
        ]);
    }

    /** Meta's audio message type does not support a caption field, unlike image/video/document. */
    public function sendAudio(string $to, string $audioUrl): array
    {
        return $this->send([
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => PhoneNumber::normalize($to),
            'type' => 'audio',
            'audio' => ['link' => $audioUrl],
        ]);
    }

    public function getTemplates(string $businessAccountId): array
    {
        $url = "{$this->baseUrl}/{$this->apiVersion}/{$businessAccountId}/message_templates";

        try {
            $response = Http::withToken($this->accessToken)
                ->timeout(30)
                ->get($url, ['fields' => 'name,language,category,status,components', 'limit' => 200]);

            if ($response->successful()) {
                return $response->json('data', []);
            }

            Log::warning('[CloudApiWhatsAppSender] getTemplates failed', ['status' => $response->status(), 'body' => $response->body()]);
        } catch (\Exception $e) {
            Log::error('[CloudApiWhatsAppSender] getTemplates exception: '.$e->getMessage());
        }

        return [];
    }

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
            Log::error('[CloudApiWhatsAppSender] getPhoneNumberStatus: '.$e->getMessage());
        }

        return [];
    }

    /** Downloads a Meta media asset (image/video/audio/document) and stores it publicly, returning its URL. */
    public function downloadMedia(string $mediaId): ?string
    {
        try {
            $metaResp = Http::withToken($this->accessToken)->timeout(15)->get("{$this->baseUrl}/{$this->apiVersion}/{$mediaId}");

            if (! $metaResp->successful()) {
                Log::warning('[CloudApiWhatsAppSender] downloadMedia: failed to fetch media URL', ['id' => $mediaId]);

                return null;
            }

            $mediaUrl = $metaResp->json('url');
            $mimeType = $metaResp->json('mime_type', 'image/jpeg');
            $extension = explode('/', $mimeType)[1] ?? 'jpg';
            $extension = str_replace(['jpeg'], ['jpg'], $extension);

            $fileResp = Http::withToken($this->accessToken)->timeout(30)->get($mediaUrl);
            if (! $fileResp->successful()) {
                return null;
            }

            $filename = 'whatsapp-media/'.$mediaId.'.'.$extension;
            \Illuminate\Support\Facades\Storage::disk('public')->put($filename, $fileResp->body());

            return \Illuminate\Support\Facades\Storage::disk('public')->url($filename);
        } catch (\Exception $e) {
            Log::error('[CloudApiWhatsAppSender] downloadMedia exception: '.$e->getMessage());

            return null;
        }
    }

    private function send(array $payload, int $maxAttempts = 3): array
    {
        $url = "{$this->baseUrl}/{$this->apiVersion}/{$this->phoneNumberId}/messages";

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = Http::withToken($this->accessToken)->timeout(30)->post($url, $payload);

                if ($response->successful()) {
                    return $response->json();
                }

                $errorBody = $response->json() ?? [];
                $errorCode = $errorBody['error']['code'] ?? null;
                $errorMessage = $errorBody['error']['message'] ?? $response->body();

                Log::warning("[CloudApiWhatsAppSender] attempt {$attempt} failed", ['status' => $response->status(), 'error_code' => $errorCode]);

                if ($errorCode && in_array($errorCode, self::NON_RETRYABLE_CODES, true)) {
                    throw new \RuntimeException($this->friendlyError($errorCode, $errorMessage));
                }
            } catch (\RuntimeException $e) {
                throw $e;
            } catch (\Exception $e) {
                Log::warning("[CloudApiWhatsAppSender] attempt {$attempt} exception", ['error' => $e->getMessage()]);
            }

            if ($attempt < $maxAttempts) {
                sleep(2 ** ($attempt - 1));
            }
        }

        throw new \RuntimeException("WhatsApp message failed after {$maxAttempts} attempts.");
    }

    private function friendlyError(int $code, string $fallback): string
    {
        return match ($code) {
            131047 => "رقم جديد: لا يمكن إرسال رسالة نصية لرقم لم يتواصل معك من قبل — استخدم قالب Template (كود Meta: {$code})",
            131026 => "الرقم حجب حسابك التجاري (كود Meta: {$code})",
            131000 => "الرقم غير مسجل في WhatsApp (كود Meta: {$code})",
            131001 => "رقم الهاتف غير صحيح (كود Meta: {$code})",
            131005 => "لا يمكن التحقق من جودة الرقم (كود Meta: {$code})",
            132000 => "اسم القالب غير موجود في حسابك (كود Meta: {$code})",
            132001 => "القالب غير معتمد من Meta (كود Meta: {$code})",
            default => $fallback,
        };
    }
}
