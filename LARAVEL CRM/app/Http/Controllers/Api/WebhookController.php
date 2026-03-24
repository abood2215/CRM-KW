<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\UpdateConversationFromChatwoot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    public function chatwoot(Request $request): JsonResponse
    {
        $data = $request->all();

        UpdateConversationFromChatwoot::dispatch($data);

        return response()->json(['status' => 'received']);
    }
}
