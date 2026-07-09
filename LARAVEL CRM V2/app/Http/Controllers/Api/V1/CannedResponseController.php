<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CannedResponse\StoreCannedResponseRequest;
use App\Http\Resources\CannedResponseResource;
use App\Models\CannedResponse;
use App\Services\Activity\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CannedResponseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $responses = CannedResponse::with('user')
            ->where(function ($query) use ($request) {
                $query->whereNull('user_id')->orWhere('user_id', $request->user()->id);
            })
            ->orderBy('title')
            ->get();

        return response()->json(['canned_responses' => CannedResponseResource::collection($responses)]);
    }

    public function store(StoreCannedResponseRequest $request): JsonResponse
    {
        $response = CannedResponse::create([...$request->validated(), 'user_id' => $request->user()->id]);
        ActivityLogger::record($response, 'create', "إضافة رد جاهز: {$response->title}");

        return response()->json([
            'canned_response' => new CannedResponseResource($response),
            'message' => 'تم إضافة الرد الجاهز.',
        ], 201);
    }

    public function update(StoreCannedResponseRequest $request, CannedResponse $cannedResponse): JsonResponse
    {
        $this->authorize('update', $cannedResponse);

        $cannedResponse->update($request->validated());
        ActivityLogger::record($cannedResponse, 'update', "تحديث رد جاهز: {$cannedResponse->title}");

        return response()->json([
            'canned_response' => new CannedResponseResource($cannedResponse->fresh()),
            'message' => 'تم تحديث الرد الجاهز.',
        ]);
    }

    public function destroy(CannedResponse $cannedResponse): JsonResponse
    {
        $this->authorize('delete', $cannedResponse);

        ActivityLogger::record($cannedResponse, 'delete', "حذف رد جاهز: {$cannedResponse->title}");
        $cannedResponse->delete();

        return response()->json(['message' => 'تم حذف الرد الجاهز.']);
    }
}
