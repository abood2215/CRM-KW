<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWhatsappNumberRequest;
use App\Http\Resources\WhatsappNumberResource;
use App\Models\WhatsappNumber;
use App\Services\BaileysService;
use Illuminate\Http\JsonResponse;

class WhatsappNumberController extends Controller
{
    public function __construct(
        protected BaileysService $baileys
    ) {}

    public function index(): JsonResponse
    {
        $numbers = WhatsappNumber::orderBy('name')->get();

        return response()->json([
            'whatsapp_numbers' => WhatsappNumberResource::collection($numbers),
        ]);
    }

    public function store(StoreWhatsappNumberRequest $request): JsonResponse
    {
        $number = WhatsappNumber::create($request->validated());

        return response()->json([
            'whatsapp_number' => new WhatsappNumberResource($number),
            'message' => 'تم إضافة الرقم بنجاح.',
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $number = WhatsappNumber::findOrFail($id);
        $number->delete();

        return response()->json([
            'message' => 'تم حذف الرقم.',
        ]);
    }

    public function qr(int $id): JsonResponse
    {
        $number = WhatsappNumber::findOrFail($id);
        $result = $this->baileys->getQR($number->session_name);

        return response()->json($result);
    }

    public function status(int $id): JsonResponse
    {
        $number = WhatsappNumber::findOrFail($id);
        $result = $this->baileys->getStatus($number->session_name);

        // Update local status
        $newStatus = ($result['connected'] ?? false) ? 'connected' : 'disconnected';
        $number->update(['status' => $newStatus]);

        return response()->json([
            'whatsapp_number' => new WhatsappNumberResource($number->fresh()),
            'session_status' => $result,
        ]);
    }
}
