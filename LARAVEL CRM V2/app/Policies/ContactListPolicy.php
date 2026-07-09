<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\ContactList;
use App\Models\User;

class ContactListPolicy
{
    /** Shared team resource — everyone can see and use lists for campaigns. */
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ContactList $contactList): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    /** Agents can only edit/delete their own lists — admins/managers can manage any. */
    public function update(User $user, ContactList $contactList): bool
    {
        return $user->role !== UserRole::Agent || $contactList->user_id === $user->id;
    }

    public function delete(User $user, ContactList $contactList): bool
    {
        return $this->update($user, $contactList);
    }
}
