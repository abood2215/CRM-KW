<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class TaskPolicy
{
    /** Users without tasks.view_all only see tasks they own. */
    public static function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if (! $user->hasPermission('tasks.view_all')) {
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
        return $user->hasPermission('tasks.view_all') || $task->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Task $task): bool
    {
        return $user->hasPermission('tasks.view_all') || $task->user_id === $user->id;
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->hasPermission('tasks.view_all') || $task->user_id === $user->id;
    }
}
