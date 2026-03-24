<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'بيانات الدخول غير صحيحة.',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'الحساب موقوف. تواصل مع الإدارة.',
            ], 403);
        }

        $token = $user->createToken('crm-token')->plainTextToken;

        $user->update(['last_seen_at' => now()]);

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'تم تسجيل الخروج بنجاح.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'avatar' => 'nullable|image|max:2048',
            'password' => 'sometimes|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if ($request->hasFile('avatar')) {
            $validated['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'user' => new UserResource($user->fresh()),
            'message' => 'تم تحديث الملف الشخصي.',
        ]);
    }
}
