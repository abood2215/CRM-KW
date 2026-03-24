<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Http\Resources\ClientResource;
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

        $clients = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 20);

        return response()->json([
            'clients' => ClientResource::collection($clients),
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
        $clients = CrmClient::with('user')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="clients_' . date('Y-m-d') . '.csv"',
        ];

        return response()->stream(function () use ($clients) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM

            fputcsv($file, ['الاسم', 'الهاتف', 'البريد', 'المصدر', 'الخدمة', 'الميزانية', 'الحالة', 'المسؤول', 'تاريخ الإضافة']);

            foreach ($clients as $client) {
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

            fclose($file);
        }, 200, $headers);
    }

    public function pipeline(): JsonResponse
    {
        $statuses = ['new', 'contacted', 'interested', 'booked', 'active', 'following'];
        $pipeline = [];

        foreach ($statuses as $status) {
            $clients = CrmClient::with('user')
                ->where('status', $status)
                ->orderBy('created_at', 'desc')
                ->get();

            $pipeline[] = [
                'status' => $status,
                'count' => $clients->count(),
                'clients' => ClientResource::collection($clients),
            ];
        }

        return response()->json(['pipeline' => $pipeline]);
    }
}
