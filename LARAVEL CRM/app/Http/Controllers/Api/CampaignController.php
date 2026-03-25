<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCampaignRequest;
use App\Http\Resources\CampaignResource;
use App\Jobs\ProcessCampaignJob;
use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Services\CampaignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Campaign::with('user');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $campaigns = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 20);

        return response()->json([
            'campaigns' => CampaignResource::collection($campaigns),
            'meta' => [
                'current_page' => $campaigns->currentPage(),
                'last_page' => $campaigns->lastPage(),
                'per_page' => $campaigns->perPage(),
                'total' => $campaigns->total(),
            ],
        ]);
    }

    public function store(StoreCampaignRequest $request): JsonResponse
    {
        $data = $request->validated();
        $recipients = $data['recipients'];
        unset($data['recipients']);

        $data['user_id'] = $request->user()->id;
        $data['total_recipients'] = count($recipients);

        $campaign = Campaign::create($data);

        foreach ($recipients as $recipient) {
            CampaignRecipient::create([
                'campaign_id' => $campaign->id,
                'phone' => $recipient['phone'],
                'name' => $recipient['name'] ?? null,
            ]);
        }

        // If scheduled, dispatch later; otherwise dispatch now
        if ($campaign->scheduled_at) {
            ProcessCampaignJob::dispatch($campaign->id)->delay($campaign->scheduled_at);
            $campaign->update(['status' => 'scheduled']);
        } else {
            ProcessCampaignJob::dispatch($campaign->id);
        }

        return response()->json([
            'campaign' => new CampaignResource($campaign->load('user')),
            'message' => 'تم إنشاء الحملة بنجاح.',
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $campaign = Campaign::with(['user', 'recipients'])->findOrFail($id);

        return response()->json([
            'campaign' => new CampaignResource($campaign),
            'recipients' => $campaign->recipients->map(function ($r) {
                return [
                    'id' => $r->id,
                    'phone' => $r->phone,
                    'name' => $r->name,
                    'status' => $r->status,
                    'sent_at' => $r->sent_at?->toISOString(),
                    'error_message' => $r->error_message,
                ];
            }),
        ]);
    }

    public function pause(int $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);

        if (!in_array($campaign->status, ['running', 'scheduled'])) {
            return response()->json([
                'message' => 'لا يمكن إيقاف هذه الحملة.',
            ], 422);
        }

        $campaign->update(['status' => 'paused']);

        return response()->json([
            'campaign' => new CampaignResource($campaign->fresh()),
            'message' => 'تم إيقاف الحملة مؤقتاً.',
        ]);
    }

    public function resume(int $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);

        if ($campaign->status !== 'paused') {
            return response()->json([
                'message' => 'الحملة ليست موقوفة.',
            ], 422);
        }

        ProcessCampaignJob::dispatch($campaign->id);

        return response()->json([
            'campaign' => new CampaignResource($campaign->fresh()),
            'message' => 'تم استئناف الحملة.',
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);

        if ($campaign->status === 'running') {
            return response()->json([
                'message' => 'لا يمكن حذف حملة قيد التشغيل. أوقفها أولاً.',
            ], 422);
        }

        $campaign->recipients()->delete();
        $campaign->delete();

        return response()->json([
            'message' => 'تم حذف الحملة.',
        ]);
    }

    // تعديل الحملة (قبل بدئها)
    public function update(Request $request, int $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);

        if ($campaign->status === 'running') {
            return response()->json(['message' => 'لا يمكن تعديل حملة جارية.'], 422);
        }

        $validated = $request->validate([
            'name'               => 'sometimes|string|max:255',
            'description'        => 'nullable|string',
            'whatsapp_number_id' => 'sometimes|exists:whatsapp_numbers,id',
            'template_name'      => 'sometimes|string',
            'template_language'  => 'sometimes|string',
            'template_variables' => 'nullable|array',
            'contact_list_id'    => 'nullable|exists:contact_lists,id',
            'scheduled_at'       => 'nullable|date|after:now',
            'delay_seconds'      => 'sometimes|integer|min:120|max:300',
            'stop_on_fail_rate'  => 'sometimes|integer|min:1|max:100',
        ]);

        $campaign->update($validated);

        return response()->json([
            'campaign' => new CampaignResource($campaign->fresh('user')),
            'message'  => 'تم تحديث الحملة.',
        ]);
    }

    // بدء الحملة يدوياً
    public function start(int $id): JsonResponse
    {
        $campaign = Campaign::findOrFail($id);
        $service  = new CampaignService();

        try {
            $campaign = $service->startCampaign($campaign);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'campaign' => new CampaignResource($campaign),
            'message'  => 'تم بدء الحملة.',
        ]);
    }

    // قائمة المستلمين مع pagination
    public function recipients(Request $request, int $id): JsonResponse
    {
        $campaign   = Campaign::findOrFail($id);
        $recipients = $campaign->recipients()
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->orderBy('id')
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'recipients' => $recipients->items(),
            'meta' => [
                'current_page' => $recipients->currentPage(),
                'last_page'    => $recipients->lastPage(),
                'total'        => $recipients->total(),
            ],
        ]);
    }

    // إحصائيات الحملة التفصيلية
    public function analytics(int $id): JsonResponse
    {
        $campaign = Campaign::with('recipients')->findOrFail($id);
        $service  = new CampaignService();

        return response()->json([
            'campaign'  => new CampaignResource($campaign),
            'analytics' => $service->getAnalytics($campaign),
        ]);
    }
}
