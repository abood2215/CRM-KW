<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class TaskPolicy
{
    /** Agents only see tasks they own; admins/managers see everything. */
    public static function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->role === UserRole::Agent) {
            return $query->where('user_id', $user->id);
        }

        return $query;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Task $task): bool
    {
        return $user->role !== UserRole::Agent || $task->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Task $task): bool
    {
        return $user->role !== UserRole::Agent || $task->user_id === $user->id;
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->role !== UserRole::Agent || $task->user_id === $user->id;
    }

    public function reassign(User $user): bool
    {
        return $user->role !== UserRole::Agent;
    }
}
