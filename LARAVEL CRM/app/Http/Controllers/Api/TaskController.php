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
        $user  = $request->user();
        $query = CrmTask::with(['user', 'client']);

        // Agents see only their own tasks
        if ($user->role === 'agent') {
            $query->where('user_id', $user->id);
        } elseif ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
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
        $user = $request->user();

        // Only admin/manager can assign a task to another user
        if ($user->role === 'agent' || !isset($data['user_id'])) {
            $data['user_id'] = $user->id;
        }

        $task = CrmTask::create($data);

        return response()->json([
            'task' => new TaskResource($task->load(['user', 'client'])),
            'message' => 'تم إنشاء المهمة بنجاح.',
        ], 201);
    }

    public function update(UpdateTaskRequest $request, int $id): JsonResponse
    {
        $user  = $request->user();
        $query = CrmTask::query();

        if ($user->role === 'agent') {
            $query->where('user_id', $user->id);
        }

        $task = $query->findOrFail($id);
        $data = $request->validated();

        // Only admin/manager can reassign a task to another user
        if ($user->role === 'agent') {
            unset($data['user_id']);
        }

        $task->update($data);

        return response()->json([
            'task' => new TaskResource($task->fresh()->load(['user', 'client'])),
            'message' => 'تم تحديث المهمة.',
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user  = $request->user();
        $query = CrmTask::query();

        if ($user->role === 'agent') {
            $query->where('user_id', $user->id);
        }

        $task = $query->findOrFail($id);
        $task->delete();

        return response()->json([
            'message' => 'تم حذف المهمة.',
        ]);
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        $user  = $request->user();
        $query = CrmTask::query();

        if ($user->role === 'agent') {
            $query->where('user_id', $user->id);
        }

        $task = $query->findOrFail($id);
        $task->markAsCompleted();

        return response()->json([
            'task' => new TaskResource($task->fresh()->load(['user', 'client'])),
            'message' => 'تم إكمال المهمة.',
        ]);
    }
}
