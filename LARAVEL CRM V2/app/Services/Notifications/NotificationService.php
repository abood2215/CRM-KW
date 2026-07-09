<?php

namespace App\Services\Notifications;

use App\Events\NotificationEvent;
use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public static function send(int $userId, string $type, string $title, string $message, array $data = []): void
    {
        Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
        ]);

        event(new NotificationEvent($userId, $type, $title, $message, $data));
    }

    /** "Management" here means whoever can manage general settings — the same audience the old admin/manager roles gave. */
    public static function sendToAdmins(string $type, string $title, string $message, array $data = []): void
    {
        $admins = User::with('role.permissions')
            ->get()
            ->filter(fn (User $user) => $user->hasPermission('settings.manage'))
            ->pluck('id');

        foreach ($admins as $userId) {
            self::send($userId, $type, $title, $message, $data);
        }
    }
}
