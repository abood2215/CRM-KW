<?php

namespace App\Http\Controllers\Api;

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
        $data = $request->all();

        UpdateConversationFromChatwoot::dispatch($data);

        return response()->json(['status' => 'received']);
    }

    /**
     * GET /webhooks/whatsapp – Meta webhook verification challenge.
     */
    public function whatsappVerify(Request $request): Response|JsonResponse
    {
        $mode      = $request->query('hub_mode');
        $token     = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if ($mode === 'subscribe' && $token === config('services.whatsapp.webhook_verify_token')) {
            Log::info('[WhatsApp Webhook] Verified successfully');
            return response($challenge, 200);
        }

        Log::warning('[WhatsApp Webhook] Verification failed', ['token' => $token]);
        return response()->json(['error' => 'Forbidden'], 403);
    }

    /**
     * POST /webhooks/whatsapp – Receive messages and status updates from Meta.
     */
    public function whatsapp(Request $request): JsonResponse
    {
        $payload = $request->all();

        Log::debug('[WhatsApp Webhook] Payload received', ['object' => $payload['object'] ?? null]);

        if (($payload['object'] ?? '') !== 'whatsapp_business_account') {
            return response()->json(['status' => 'ignored']);
        }

        ProcessWhatsAppWebhookJob::dispatch($payload);

        return response()->json(['status' => 'received']);
    }
}
