<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ConversationPolicy
{
    /** Agents see conversations assigned to them, plus anything unassigned. */
    public static function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->role === UserRole::Agent) {
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
        return $user->role !== UserRole::Agent
            || $conversation->assigned_user_id === null
            || $conversation->assigned_user_id === $user->id;
    }

    public function update(User $user, Conversation $conversation): bool
    {
        return $this->view($user, $conversation);
    }

    /** Only admin/manager can reassign a conversation to a different agent. */
    public function assign(User $user): bool
    {
        return $user->role !== UserRole::Agent;
    }
}
