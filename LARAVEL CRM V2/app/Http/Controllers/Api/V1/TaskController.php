<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Events\TaskUpdatedEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Policies\TaskPolicy;
use App\Services\Activity\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = TaskPolicy::scopeVisibleTo(Task::with(['user', 'contact']), $request->user());

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('contact_id')) {
            $query->where('contact_id', $request->contact_id);
        }

        if ($request->has('due_date')) {
            $query->whereDate('due_date', $request->due_date);
        }

        $tasks = $query
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
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
        $this->authorize('create', Task::class);

        $data = $request->validated();
        $user = $request->user();

        if ($user->role === UserRole::Agent || ! isset($data['user_id'])) {
            $data['user_id'] = $user->id;
        }

        $task = Task::create($data);

        ActivityLogger::record($task, 'create', "إنشاء مهمة: {$task->title}");
        event(new TaskUpdatedEvent($task->id));

        return response()->json([
            'task' => new TaskResource($task->load(['user', 'contact'])),
            'message' => 'تم إنشاء المهمة بنجاح.',
        ], 201);
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $data = $request->validated();

        if ($request->user()->role === UserRole::Agent) {
            unset($data['user_id']);
        }

        $task->update($data);

        ActivityLogger::record($task, 'update', "تحديث مهمة: {$task->title}");
        event(new TaskUpdatedEvent($task->id));

        return response()->json([
            'task' => new TaskResource($task->fresh()->load(['user', 'contact'])),
            'message' => 'تم تحديث المهمة.',
        ]);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        ActivityLogger::record($task, 'delete', "حذف مهمة: {$task->title}");

        $taskId = $task->id;
        $task->delete();
        event(new TaskUpdatedEvent($taskId));

        return response()->json([
            'message' => 'تم حذف المهمة.',
        ]);
    }

    public function complete(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $task->markAsCompleted();

        ActivityLogger::record($task, 'complete', "إكمال مهمة: {$task->title}");
        event(new TaskUpdatedEvent($task->id));

        return response()->json([
            'task' => new TaskResource($task->fresh()->load(['user', 'contact'])),
            'message' => 'تم إكمال المهمة.',
        ]);
    }
}
