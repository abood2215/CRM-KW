<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PermissionResource;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    /** Read-only — permissions correspond to real code checks, so only developers add new ones. */
    public function index(): JsonResponse
    {
        $permissions = Permission::orderBy('group')->orderBy('label')->get();

        return response()->json(['permissions' => PermissionResource::collection($permissions)]);
    }
}
