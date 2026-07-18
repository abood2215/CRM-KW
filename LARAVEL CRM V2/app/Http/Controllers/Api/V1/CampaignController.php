<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Campaign\StoreCampaignRequest;
use App\Http\Requests\Campaign\UpdateCampaignRequest;
use App\Http\Resources\CampaignRecipientResource;
use App\Http\Resources\CampaignResource;
use App\Models\Campaign;
use App\Services\Activity\ActivityLogger;
use App\Services\Campaigns\CampaignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CampaignController extends Controller
{
    public function __construct(private readonly CampaignService $campaigns)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Campaign::with(['user', 'whatsappNumber']);

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
        $this->authorize('create', Campaign::class);

        try {
            $result = $this->campaigns->createFromRequest($request->validated(), $request->user());
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        ActivityLogger::record($result['campaign'], 'create', "إنشاء حملة: {$result['campaign']->name}");

        $response = [
            'campaign' => new CampaignResource($result['campaign']->load(['user', 'whatsappNumber'])),
            'message' => 'تم إنشاء الحملة بنجاح.',
        ];

        if ($result['skipped'] > 0) {
            $response['skipped'] = $result['skipped'];
            $response['skipped_message'] = "تم تخطي {$result['skipped']} مستلم (محظور أو ألغى الاشتراك أو مكرر).";
        }

        return response()->json($response, 201);
    }

    public function show(Campaign $campaign): JsonResponse
    {
        $campaign->load(['user', 'whatsappNumber', 'contactList']);

        return response()->json(['campaign' => new CampaignResource($campaign)]);
    }

    public function update(UpdateCampaignRequest $request, Campaign $campaign): JsonResponse
    {
        $this->authorize('update', $campaign);

        $validated = $request->validated();
        $scheduledAtChanged = array_key_exists('scheduled_at', $validated)
            && $validated['scheduled_at'] !== $campaign->scheduled_at?->toDateTimeString();

        if ($scheduledAtChanged) {
            $validated['status'] = empty($validated['scheduled_at']) ? 'draft' : 'scheduled';
        }

        $campaign->update($validated);
        ActivityLogger::record($campaign, 'update', "تحديث حملة: {$campaign->name}");

        return response()->json([
            'campaign' => new CampaignResource($campaign->fresh(['user', 'whatsappNumber'])),
            'message' => 'تم تحديث الحملة.',
        ]);
    }

    public function destroy(Campaign $campaign): JsonResponse
    {
        $this->authorize('delete', $campaign);

        ActivityLogger::record($campaign, 'delete', "حذف حملة: {$campaign->name}");
        $campaign->recipients()->delete();
        $campaign->delete();

        return response()->json(['message' => 'تم حذف الحملة.']);
    }

    public function start(Campaign $campaign): JsonResponse
    {
        $this->authorize('manage', $campaign);

        if (! $campaign->template_name && ! $campaign->message_text) {
            return response()->json(['message' => 'الحملة لا تحتوي على رسالة أو قالب.'], 422);
        }

        try {
            $campaign = $this->campaigns->startCampaign($campaign);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        ActivityLogger::record($campaign, 'start', "بدء حملة: {$campaign->name}");

        return response()->json([
            'campaign' => new CampaignResource($campaign),
            'message' => 'تم بدء الحملة.',
        ]);
    }

    public function pause(Campaign $campaign): JsonResponse
    {
        $this->authorize('manage', $campaign);

        try {
            $campaign = $this->campaigns->pauseCampaign($campaign);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        ActivityLogger::record($campaign, 'pause', "إيقاف حملة مؤقتاً: {$campaign->name}");

        return response()->json([
            'campaign' => new CampaignResource($campaign),
            'message' => 'تم إيقاف الحملة مؤقتاً.',
        ]);
    }

    public function resume(Campaign $campaign): JsonResponse
    {
        $this->authorize('manage', $campaign);

        try {
            $campaign = $this->campaigns->resumeCampaign($campaign);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        ActivityLogger::record($campaign, 'resume', "استئناف حملة: {$campaign->name}");

        return response()->json([
            'campaign' => new CampaignResource($campaign),
            'message' => 'تم استئناف الحملة.',
        ]);
    }

    public function recipients(Request $request, Campaign $campaign): JsonResponse
    {
        $recipients = $campaign->recipients()
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderBy('id')
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'recipients' => CampaignRecipientResource::collection($recipients),
            'meta' => [
                'current_page' => $recipients->currentPage(),
                'last_page' => $recipients->lastPage(),
                'per_page' => $recipients->perPage(),
                'total' => $recipients->total(),
            ],
        ]);
    }

    public function analytics(Campaign $campaign): JsonResponse
    {
        return response()->json([
            'campaign' => new CampaignResource($campaign),
            'analytics' => $this->campaigns->getAnalytics($campaign),
        ]);
    }

    /**
     * Full campaign report: analytics + hourly chart + paginated recipient list.
     * Fixes the old app's hardcoded 200-recipient cap — real pagination instead.
     */
    public function report(Request $request, Campaign $campaign): JsonResponse
    {
        $hourlyStats = $campaign->recipients()
            ->whereNotNull('sent_at')
            ->selectRaw("
                DATE_FORMAT(sent_at, '%Y-%m-%d %H:00') as hour,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied
            ")
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->map(fn ($row) => [
                'hour' => $row->hour,
                'total' => (int) $row->total,
                'sent' => (int) $row->sent,
                'failed' => (int) $row->failed,
                'replied' => (int) $row->replied,
            ]);

        $recipients = $campaign->recipients()
            ->orderBy('id')
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'campaign' => new CampaignResource($campaign->load(['user', 'whatsappNumber'])),
            'analytics' => $this->campaigns->getAnalytics($campaign),
            'hourly_stats' => $hourlyStats,
            'recipients' => CampaignRecipientResource::collection($recipients),
            'meta' => [
                'current_page' => $recipients->currentPage(),
                'last_page' => $recipients->lastPage(),
                'per_page' => $recipients->perPage(),
                'total' => $recipients->total(),
            ],
        ]);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $this->authorize('manage', Campaign::class);

        $request->validate(['image' => 'required|file|mimes:jpeg,jpg,png,gif,webp|max:10240']);

        $file = $request->file('image');
        $fileName = Str::uuid().'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('campaign-images', $fileName, 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

    /**
     * Manual bulk-block for failed recipients — now secondary/rarely needed since
     * MessageStatusUpdateService already auto-blocks on delivery failure. Kept as a
     * manual fallback (e.g. failures that never got a status webhook).
     */
    public function blacklistFailed(Campaign $campaign): JsonResponse
    {
        $this->authorize('manage', $campaign);

        $failed = $campaign->recipients()->where('status', 'failed')->with('contact')->get();

        if ($failed->isEmpty()) {
            return response()->json(['message' => 'لا توجد أرقام فاشلة في هذه الحملة.']);
        }

        $count = 0;
        foreach ($failed as $recipient) {
            $recipient->contact?->markBlacklisted(null);
            $count++;
        }

        $campaign->recipients()->where('status', 'failed')->delete();
        $campaign->update(['failed_count' => 0, 'total_recipients' => $campaign->recipients()->count()]);

        return response()->json(['message' => "تم حظر {$count} رقم وإزالتهم من الحملة.", 'count' => $count]);
    }
}
