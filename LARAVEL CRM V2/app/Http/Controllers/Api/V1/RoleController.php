<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use App\Services\Activity\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    /** Permissions that must always stay on the "admin" role so there's always a working recovery account. */
    private const PROTECTED_ADMIN_PERMISSIONS = ['roles.manage', 'users.manage'];

    public function index(Request $request): JsonResponse
    {
        // Creating/editing a user (users.manage) requires picking a role, so the list itself
        // can't be locked fully behind roles.manage — only role create/update/delete stay there.
        abort_unless($request->user()->hasPermission('roles.manage') || $request->user()->hasPermission('users.manage'), 403);

        $roles = Role::withCount('users')->with('permissions')->orderBy('id')->get();

        return response()->json(['roles' => RoleResource::collection($roles)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'permission_keys' => 'sometimes|array',
            'permission_keys.*' => 'string|exists:permissions,key',
        ]);

        $role = Role::create([
            'name' => $data['name'],
            'slug' => 'custom-'.Str::random(10),
            'is_system' => false,
        ]);

        $this->syncPermissions($role, $data['permission_keys'] ?? []);
        ActivityLogger::record($role, 'create', "إنشاء دور: {$role->name}");

        return response()->json([
            'role' => new RoleResource($role->load('permissions')),
            'message' => 'تم إنشاء الدور بنجاح.',
        ], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'permission_keys' => 'sometimes|array',
            'permission_keys.*' => 'string|exists:permissions,key',
        ]);

        if ($role->slug === 'admin' && array_key_exists('permission_keys', $data)) {
            $missing = array_diff(self::PROTECTED_ADMIN_PERMISSIONS, $data['permission_keys']);
            if ($missing) {
                return response()->json([
                    'message' => 'لا يمكن سحب صلاحيات الإدارة الأساسية من دور المدير — يضمن هذا وجود مسار استرجاع دائم للنظام.',
                ], 422);
            }
        }

        if (isset($data['name'])) {
            $role->update(['name' => $data['name']]);
        }

        if (array_key_exists('permission_keys', $data)) {
            $this->syncPermissions($role, $data['permission_keys']);
        }

        ActivityLogger::record($role, 'update', "تحديث دور: {$role->name}");

        return response()->json([
            'role' => new RoleResource($role->fresh()->load('permissions')),
            'message' => 'تم تحديث الدور بنجاح.',
        ]);
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($role->slug === 'admin') {
            return response()->json(['message' => 'لا يمكن حذف دور المدير الأساسي.'], 422);
        }

        if ($role->users()->exists()) {
            return response()->json(['message' => 'هذا الدور مرتبط بمستخدمين حالياً — أعد تعيينهم لدور آخر أولاً.'], 422);
        }

        ActivityLogger::record($role, 'delete', "حذف دور: {$role->name}");
        $role->delete();

        return response()->json(['message' => 'تم حذف الدور بنجاح.']);
    }

    private function syncPermissions(Role $role, array $keys): void
    {
        $ids = Permission::whereIn('key', $keys)->pluck('id');
        $role->permissions()->sync($ids);
    }
}
