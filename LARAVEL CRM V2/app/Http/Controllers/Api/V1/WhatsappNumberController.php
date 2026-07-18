<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\WhatsappNumber\StoreWhatsappNumberRequest;
use App\Http\Requests\WhatsappNumber\UpdateWhatsappNumberRequest;
use App\Http\Resources\WhatsappNumberResource;
use App\Jobs\SyncTemplatesJob;
use App\Models\WhatsappNumber;
use App\Services\Activity\ActivityLogger;
use App\Services\Whatsapp\BaileysWhatsAppSender;
use Illuminate\Http\JsonResponse;

class WhatsappNumberController extends Controller
{
    public function index(): JsonResponse
    {
        $numbers = WhatsappNumber::orderBy('name')->get();

        return response()->json(['whatsapp_numbers' => WhatsappNumberResource::collection($numbers)]);
    }

    public function store(StoreWhatsappNumberRequest $request): JsonResponse
    {
        $this->authorize('create', WhatsappNumber::class);

        $number = WhatsappNumber::create($request->validated());
        ActivityLogger::record($number, 'create', "إضافة رقم واتساب: {$number->name}");

        return response()->json([
            'whatsapp_number' => new WhatsappNumberResource($number),
            'message' => 'تم إضافة الرقم بنجاح.',
        ], 201);
    }

    public function update(UpdateWhatsappNumberRequest $request, WhatsappNumber $whatsappNumber): JsonResponse
    {
        $this->authorize('update', $whatsappNumber);

        $whatsappNumber->update($request->validated());
        ActivityLogger::record($whatsappNumber, 'update', "تحديث رقم واتساب: {$whatsappNumber->name}");

        return response()->json([
            'whatsapp_number' => new WhatsappNumberResource($whatsappNumber->fresh()),
            'message' => 'تم تحديث الرقم.',
        ]);
    }

    public function destroy(WhatsappNumber $whatsappNumber): JsonResponse
    {
        $this->authorize('delete', $whatsappNumber);

        ActivityLogger::record($whatsappNumber, 'delete', "حذف رقم واتساب: {$whatsappNumber->name}");
        $whatsappNumber->delete();

        return response()->json(['message' => 'تم حذف الرقم.']);
    }

    public function status(WhatsappNumber $whatsappNumber): JsonResponse
    {
        if ($whatsappNumber->isCloud()) {
            return response()->json([
                'whatsapp_number' => new WhatsappNumberResource($whatsappNumber),
                'session_status' => ['connected' => $whatsappNumber->canSend()],
            ]);
        }

        $result = (new BaileysWhatsAppSender($whatsappNumber->session_name))->getStatus();
        $whatsappNumber->update(['status' => ($result['connected'] ?? false) ? 'connected' : 'disconnected']);

        return response()->json([
            'whatsapp_number' => new WhatsappNumberResource($whatsappNumber->fresh()),
            'session_status' => $result,
        ]);
    }

    public function qr(WhatsappNumber $whatsappNumber): JsonResponse
    {
        if ($whatsappNumber->isCloud()) {
            return response()->json(['message' => 'أرقام Cloud API لا تحتاج QR.'], 422);
        }

        return response()->json((new BaileysWhatsAppSender($whatsappNumber->session_name))->getQr());
    }

    public function syncTemplates(WhatsappNumber $whatsappNumber): JsonResponse
    {
        $this->authorize('update', $whatsappNumber);

        if (! $whatsappNumber->access_token || ! $whatsappNumber->phone_number_id) {
            return response()->json(['message' => 'هذا الرقم لا يدعم Cloud API. أضف access_token و phone_number_id.'], 422);
        }

        SyncTemplatesJob::dispatch($whatsappNumber->id);

        return response()->json(['message' => 'جاري مزامنة القوالب في الخلفية.']);
    }
}
