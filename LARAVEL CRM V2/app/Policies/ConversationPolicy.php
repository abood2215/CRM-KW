<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ConversationPolicy
{
    /** Users without conversations.view_all see conversations assigned to them, plus anything
     * unassigned — except a sandboxed test account, which must not see the shared inbox of
     * real unassigned conversations at all, only whatever it starts itself. */
    public static function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->isSandboxed()) {
            return $query->where('assigned_user_id', $user->id);
        }

        if (! $user->hasPermission('conversations.view_all')) {
            return $query->where(function (Builder $q) use ($user) {
                $q->where('assigned_user_id', $user->id)->orWhereNull('assigned_user_id');
            });
        }

        return $query;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Conversation $conversation): bool
    {
        return $user->hasPermission('conversations.view_all')
            || $conversation->assigned_user_id === null
            || $conversation->assigned_user_id === $user->id;
    }

    public function update(User $user, Conversation $conversation): bool
    {
        return $this->view($user, $conversation);
    }

    public function assign(User $user): bool
    {
        return $user->hasPermission('conversations.assign');
    }
}
