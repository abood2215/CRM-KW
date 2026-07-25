<?php

use App\Models\Conversation;
use App\Policies\ConversationPolicy;
use Illuminate\Support\Facades\Broadcast;

// Private channel for per-user notifications — only the authenticated user can subscribe.
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Message content and customer names used to broadcast on a public channel — anyone who
// discovered the app key could subscribe and read every conversation, with no auth at all.
// Restricted to whoever ConversationPolicy::view() already allows to see that conversation.
Broadcast::channel('conversations.{id}', function ($user, $id) {
    $conversation = Conversation::find($id);

    return $conversation && (new ConversationPolicy())->view($user, $conversation);
});

// The conversation-list channel has no single ID to authorize against — any authenticated
// staff member may subscribe. Per-row visibility is still enforced by the REST list endpoint
// (ConversationPolicy::scopeVisibleTo); this only gates the "something changed" broadcast itself.
Broadcast::channel('conversations', function ($user) {
    return (bool) $user;
});

// Presence channel: every staff member currently connected joins this on login and leaves on
// tab close/logout, giving a real-time "online now" list — unlike users.last_seen_at (only
// updated by a request-driven middleware, so it reads "online" for up to 5 minutes after
// someone actually left).
Broadcast::channel('presence.online', function ($user) {
    return ['id' => $user->id, 'name' => $user->name];
});
