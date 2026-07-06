<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Stats\StatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    public function __construct(private readonly StatsService $stats)
    {
    }

    public function dashboard(Request $request): JsonResponse
    {
        return response()->json($this->stats->dashboard($request->get('range', 'week')));
    }

    public function campaigns(): JsonResponse
    {
        return response()->json($this->stats->campaigns());
    }

    public function agents(): JsonResponse
    {
        return response()->json(['agents' => $this->stats->agents()]);
    }

    public function whatsapp(): JsonResponse
    {
        return response()->json($this->stats->whatsapp());
    }
}
