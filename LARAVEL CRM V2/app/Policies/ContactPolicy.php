<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ContactPolicy
{
    /** Agents only see contacts they own; admins/managers see everything. */
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

    public function view(User $user, Contact $contact): bool
    {
        return $user->role !== UserRole::Agent || $contact->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Contact $contact): bool
    {
        return $user->role !== UserRole::Agent || $contact->user_id === $user->id;
    }

    public function delete(User $user, Contact $contact): bool
    {
        return $user->role !== UserRole::Agent || $contact->user_id === $user->id;
    }

    /** Only admin/manager can assign a contact's ownership to someone else. */
    public function reassign(User $user): bool
    {
        return $user->role !== UserRole::Agent;
    }
}
