<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $notifications->whereNull('read_at')->count(),
        ]);
    }

    public function markRead(int $id, Request $request): JsonResponse
    {
        Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'تم التحديث']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'تم تحديد الكل كمقروء']);
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'تم الحذف']);
    }
}
