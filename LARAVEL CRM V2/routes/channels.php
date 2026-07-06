<?php

use Illuminate\Support\Facades\Broadcast;

// Private channel for per-user notifications — only the authenticated user can subscribe.
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
