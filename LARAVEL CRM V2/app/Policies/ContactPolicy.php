<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ContactPolicy
{
    /** Users without contacts.view_all only see contacts they own. */
    public static function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if (! $user->hasPermission('contacts.view_all')) {
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
        return $user->hasPermission('contacts.view_all') || $contact->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Contact $contact): bool
    {
        return $user->hasPermission('contacts.view_all') || $contact->user_id === $user->id;
    }

    public function delete(User $user, Contact $contact): bool
    {
        return $user->hasPermission('contacts.view_all') || $contact->user_id === $user->id;
    }
}
