<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCannedResponseRequest;
use App\Http\Resources\CannedResponseResource;
use App\Models\CannedResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CannedResponseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $responses = CannedResponse::with('user')
            ->where(function ($query) use ($request) {
                $query->whereNull('user_id')
                    ->orWhere('user_id', $request->user()->id);
            })
            ->orderBy('title')
            ->get();

        return response()->json([
            'canned_responses' => CannedResponseResource::collection($responses),
        ]);
    }

    public function store(StoreCannedResponseRequest $request): JsonResponse
    {
        $response = CannedResponse::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'canned_response' => new CannedResponseResource($response),
            'message' => 'تم إضافة الرد الجاهز.',
        ], 201);
    }

    public function update(StoreCannedResponseRequest $request, int $id): JsonResponse
    {
        $response = CannedResponse::findOrFail($id);
        $response->update($request->validated());

        return response()->json([
            'canned_response' => new CannedResponseResource($response->fresh()),
            'message' => 'تم تحديث الرد الجاهز.',
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $response = CannedResponse::findOrFail($id);
        $response->delete();

        return response()->json([
            'message' => 'تم حذف الرد الجاهز.',
        ]);
    }
}
