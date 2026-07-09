<?php

namespace App\Policies;

use App\Models\CannedResponse;
use App\Models\User;

class CannedResponsePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    /** Owns it → always allowed. A shared/global response (user_id null) → admin/manager only. */
    public function update(User $user, CannedResponse $cannedResponse): bool
    {
        if ($cannedResponse->user_id === $user->id) {
            return true;
        }

        return $user->hasPermission('canned_responses.manage_global');
    }

    public function delete(User $user, CannedResponse $cannedResponse): bool
    {
        return $this->update($user, $cannedResponse);
    }
}
