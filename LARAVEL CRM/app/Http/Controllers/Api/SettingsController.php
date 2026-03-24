<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AutoReply;
use App\Models\BusinessHour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function getBusinessHours(): JsonResponse
    {
        $hours = BusinessHour::orderBy('day_of_week')->get();

        return response()->json([
            'business_hours' => $hours,
        ]);
    }

    public function updateBusinessHours(Request $request): JsonResponse
    {
        $request->validate([
            'hours' => 'required|array',
            'hours.*.day_of_week' => 'required|integer|between:0,6',
            'hours.*.start_time' => 'required|date_format:H:i',
            'hours.*.end_time' => 'required|date_format:H:i|after:hours.*.start_time',
            'hours.*.is_active' => 'required|boolean',
        ]);

        foreach ($request->hours as $hour) {
            BusinessHour::updateOrCreate(
                ['day_of_week' => $hour['day_of_week']],
                [
                    'start_time' => $hour['start_time'],
                    'end_time' => $hour['end_time'],
                    'is_active' => $hour['is_active'],
                ]
            );
        }

        return response()->json([
            'business_hours' => BusinessHour::orderBy('day_of_week')->get(),
            'message' => 'تم تحديث ساعات العمل.',
        ]);
    }

    public function getAutoReplies(): JsonResponse
    {
        $replies = AutoReply::all();

        return response()->json([
            'auto_replies' => $replies,
        ]);
    }

    public function updateAutoReplies(Request $request): JsonResponse
    {
        $request->validate([
            'replies' => 'required|array',
            'replies.*.trigger' => 'required|in:outside_hours,first_message',
            'replies.*.message' => 'required|string',
            'replies.*.is_active' => 'required|boolean',
        ]);

        foreach ($request->replies as $reply) {
            AutoReply::updateOrCreate(
                ['trigger' => $reply['trigger']],
                [
                    'message' => $reply['message'],
                    'is_active' => $reply['is_active'],
                ]
            );
        }

        return response()->json([
            'auto_replies' => AutoReply::all(),
            'message' => 'تم تحديث الردود التلقائية.',
        ]);
    }
}
