<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessWhatsAppWebhookJob;
use App\Jobs\UpdateConversationFromChatwoot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function chatwoot(Request $request): JsonResponse
    {
        $secret = config('services.chatwoot.webhook_secret');
        if ($secret) {
            $signature = $request->header('X-Chatwoot-Signature');
            $expected = hash_hmac('sha256', $request->getContent(), $secret);

            if (! $signature || ! hash_equals($expected, $signature)) {
                Log::warning('[Chatwoot Webhook] Invalid signature');

                return response()->json(['error' => 'Forbidden'], 403);
            }
        }

        UpdateConversationFromChatwoot::dispatch($request->all());

        return response()->json(['status' => 'received']);
    }

    /** GET /webhooks/whatsapp — Meta webhook verification challenge. */
    public function whatsappVerify(Request $request): Response|JsonResponse
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if ($mode === 'subscribe' && $token === config('services.whatsapp.webhook_verify_token')) {
            return response($challenge, 200);
        }

        Log::warning('[WhatsApp Webhook] Verification failed', ['token' => $token]);

        return response()->json(['error' => 'Forbidden'], 403);
    }

    /** POST /webhooks/whatsapp — Meta message/status delivery, HMAC-verified. */
    public function whatsapp(Request $request): JsonResponse
    {
        $appSecret = config('services.whatsapp.app_secret');
        if ($appSecret) {
            $signature = $request->header('X-Hub-Signature-256');
            if (! $signature) {
                return response()->json(['error' => 'Forbidden'], 403);
            }

            $expected = 'sha256='.hash_hmac('sha256', $request->getContent(), $appSecret);
            if (! hash_equals($expected, $signature)) {
                Log::warning('[WhatsApp Webhook] Invalid HMAC signature');

                return response()->json(['error' => 'Forbidden'], 403);
            }
        }

        $payload = $request->all();

        if (($payload['object'] ?? '') !== 'whatsapp_business_account') {
            return response()->json(['status' => 'ignored']);
        }

        ProcessWhatsAppWebhookJob::dispatch($payload);

        return response()->json(['status' => 'received']);
    }
}
