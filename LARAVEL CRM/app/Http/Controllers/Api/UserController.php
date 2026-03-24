<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::orderBy('name')->get();

        return response()->json([
            'users' => UserResource::collection($users),
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);

        if ($request->hasFile('avatar')) {
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user = User::create($data);

        return response()->json([
            'user' => new UserResource($user),
            'message' => 'تم إنشاء المستخدم بنجاح.',
        ], 201);
    }

    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $data = $request->validated();

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        if ($request->hasFile('avatar')) {
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user->update($data);

        return response()->json([
            'user' => new UserResource($user->fresh()),
            'message' => 'تم تحديث المستخدم بنجاح.',
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'تم حذف المستخدم بنجاح.',
        ]);
    }

    public function online(): JsonResponse
    {
        $users = User::where('is_active', true)
            ->whereNotNull('last_seen_at')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'avatar' => $user->avatar,
                    'is_online' => $user->isOnline(),
                    'last_seen_at' => $user->last_seen_at?->toISOString(),
                ];
            });

        return response()->json(['users' => $users]);
    }
}
