<?php

namespace App\Policies;

use App\Models\ContactList;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class ContactListPolicy
{
    /** Shared team resource by default — granted to every existing role (see the migration
     * that added contact_lists.view_all), so this only actually restricts anyone once an admin
     * deliberately unchecks it for a role wanting per-agent list separation. */
    public static function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if (! $user->hasPermission('contact_lists.view_all')) {
            return $query->where('user_id', $user->id);
        }

        return $query;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ContactList $contactList): bool
    {
        return $user->hasPermission('contact_lists.view_all') || $contactList->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    /** Agents can only edit/delete their own lists — admins/managers can manage any. */
    public function update(User $user, ContactList $contactList): bool
    {
        return $user->hasPermission('contact_lists.manage_others') || $contactList->user_id === $user->id;
    }

    public function delete(User $user, ContactList $contactList): bool
    {
        return $this->update($user, $contactList);
    }
}
