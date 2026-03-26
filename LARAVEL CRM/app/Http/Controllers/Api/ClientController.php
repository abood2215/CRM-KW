<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Http\Resources\ClientResource;
use App\Models\ActivityLog;
use App\Models\CampaignRecipient;
use App\Models\CrmClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CrmClient::with('user')->withCount('tasks');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('source')) {
            $query->where('source', $request->source);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('service', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) ($request->per_page ?? 20), 100); // cap at 100
        $clients = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => ClientResource::collection($clients),
            'meta' => [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'per_page' => $clients->perPage(),
                'total' => $clients->total(),
            ],
        ]);
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (!isset($data['user_id'])) {
            $data['user_id'] = $request->user()->id;
        }

        $client = CrmClient::create($data);

        return response()->json([
            'client' => new ClientResource($client->load('user')),
            'message' => 'تم إضافة العميل بنجاح.',
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $client = CrmClient::with(['user', 'tasks', 'conversations'])->withCount('tasks')->findOrFail($id);

        return response()->json([
            'client' => new ClientResource($client),
        ]);
    }

    public function update(UpdateClientRequest $request, int $id): JsonResponse
    {
        $client = CrmClient::findOrFail($id);
        $client->update($request->validated());

        return response()->json([
            'client' => new ClientResource($client->fresh()->load('user')),
            'message' => 'تم تحديث بيانات العميل.',
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $client = CrmClient::findOrFail($id);
        $client->delete();

        return response()->json([
            'message' => 'تم حذف العميل بنجاح.',
        ]);
    }

    public function exportCsv(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="clients_' . date('Y-m-d') . '.csv"',
            'X-Accel-Buffering'   => 'no',
        ];

        return response()->stream(function () {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM

            fputcsv($file, ['الاسم', 'الهاتف', 'البريد', 'المصدر', 'الخدمة', 'الميزانية', 'الحالة', 'المسؤول', 'تاريخ الإضافة']);

            CrmClient::with('user')
                ->orderBy('id')
                ->chunk(500, function ($chunk) use ($file) {
                    foreach ($chunk as $client) {
                        fputcsv($file, [
                            $client->name,
                            $client->phone,
                            $client->email,
                            $client->source,
                            $client->service,
                            $client->budget,
                            $client->status,
                            $client->user?->name ?? '-',
                            $client->created_at->format('Y-m-d'),
                        ]);
                    }
                    ob_flush();
                    flush();
                });

            fclose($file);
        }, 200, $headers);
    }

    /**
     * Timeline أحداث العميل: رسائل، مهام، حملات، سجل نشاط
     */
    public function timeline(int $id): JsonResponse
    {
        $client = CrmClient::with([
            'conversations.messages',
            'tasks',
        ])->findOrFail($id);

        $events = collect();

        // --- رسائل المحادثات ---
        foreach ($client->conversations as $conversation) {
            foreach ($conversation->messages as $message) {
                $events->push([
                    'type'      => 'message',
                    'date'      => ($message->sent_at ?? $message->created_at)->toISOString(),
                    'direction' => $message->direction,   // in | out
                    'content'   => $message->content,
                    'sender'    => $message->sender_name,
                    'status'    => $message->status,
                ]);
            }
        }

        // --- المهام ---
        foreach ($client->tasks as $task) {
            // حدث إنشاء المهمة
            $events->push([
                'type'     => 'task_created',
                'date'     => $task->created_at->toISOString(),
                'title'    => $task->title,
                'task_type'=> $task->type,
                'priority' => $task->priority,
                'status'   => $task->status,
            ]);

            // حدث إكمال المهمة (إن وُجد)
            if ($task->completed_at) {
                $events->push([
                    'type'   => 'task_completed',
                    'date'   => \Carbon\Carbon::parse($task->completed_at)->toISOString(),
                    'title'  => $task->title,
                ]);
            }
        }

        // --- الحملات التي وصلت لهذا العميل (بناءً على رقم الهاتف) ---
        $campaignRecipients = CampaignRecipient::with('campaign')
            ->where('phone', $client->phone)
            ->whereNotNull('sent_at')
            ->get();

        foreach ($campaignRecipients as $recipient) {
            $events->push([
                'type'          => 'campaign',
                'date'          => $recipient->sent_at->toISOString(),
                'campaign_name' => $recipient->campaign?->name,
                'campaign_id'   => $recipient->campaign_id,
                'status'        => $recipient->status,
            ]);
        }

        // --- سجل النشاط المرتبط بهذا العميل ---
        $activityLogs = ActivityLog::where('model_type', 'App\\Models\\CrmClient')
            ->where('model_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($activityLogs as $log) {
            $events->push([
                'type'        => 'activity',
                'date'        => $log->created_at->toISOString(),
                'action'      => $log->action,
                'description' => $log->description,
            ]);
        }

        // ترتيب جميع الأحداث تنازلياً حسب التاريخ
        $timeline = $events->sortByDesc('date')->values();

        return response()->json([
            'client'   => new ClientResource($client),
            'timeline' => $timeline,
        ]);
    }

    public function pipeline(): JsonResponse
    {
        $statuses = ['new', 'contacted', 'interested', 'booked', 'active', 'following'];

        // Single query — group in PHP instead of N separate queries
        $all = CrmClient::with('user')
            ->whereIn('status', $statuses)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('status');

        $pipeline = array_map(fn ($status) => [
            'status'  => $status,
            'count'   => $all->get($status, collect())->count(),
            'clients' => ClientResource::collection($all->get($status, collect())),
        ], $statuses);

        return response()->json(['pipeline' => array_values($pipeline)]);
    }
}
