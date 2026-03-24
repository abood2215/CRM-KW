<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\CrmTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CrmTask::with(['user', 'client']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('due_date')) {
            $query->whereDate('due_date', $request->due_date);
        }

        $tasks = $query->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderByRaw("CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 END")
            ->orderBy('due_date', 'asc')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'tasks' => TaskResource::collection($tasks),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
            ],
        ]);
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (!isset($data['user_id'])) {
            $data['user_id'] = $request->user()->id;
        }

        $task = CrmTask::create($data);

        return response()->json([
            'task' => new TaskResource($task->load(['user', 'client'])),
            'message' => 'تم إنشاء المهمة بنجاح.',
        ], 201);
    }

    public function update(UpdateTaskRequest $request, int $id): JsonResponse
    {
        $task = CrmTask::findOrFail($id);
        $task->update($request->validated());

        return response()->json([
            'task' => new TaskResource($task->fresh()->load(['user', 'client'])),
            'message' => 'تم تحديث المهمة.',
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $task = CrmTask::findOrFail($id);
        $task->delete();

        return response()->json([
            'message' => 'تم حذف المهمة.',
        ]);
    }

    public function complete(int $id): JsonResponse
    {
        $task = CrmTask::findOrFail($id);
        $task->markAsCompleted();

        return response()->json([
            'task' => new TaskResource($task->fresh()->load(['user', 'client'])),
            'message' => 'تم إكمال المهمة.',
        ]);
    }
}
