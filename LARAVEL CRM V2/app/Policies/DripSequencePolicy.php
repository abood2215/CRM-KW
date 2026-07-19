<?php

namespace App\Policies;

use App\Models\DripSequence;
use App\Models\User;

/** Reuses campaigns.manage — drip sequences are a marketing sub-feature of campaigns, not a distinct domain. */
class DripSequencePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, DripSequence $sequence): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('campaigns.manage');
    }

    public function update(User $user, DripSequence $sequence): bool
    {
        return $user->hasPermission('campaigns.manage');
    }

    public function delete(User $user, DripSequence $sequence): bool
    {
        return $user->hasPermission('campaigns.manage');
    }
}
