<?php

namespace App\Policies;

use App\Models\Campaign;
use App\Models\User;

class CampaignPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Campaign $campaign): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('campaigns.manage');
    }

    public function update(User $user, Campaign $campaign): bool
    {
        return $user->hasPermission('campaigns.manage') && $campaign->status !== 'running';
    }

    public function delete(User $user, Campaign $campaign): bool
    {
        return $user->hasPermission('campaigns.manage') && $campaign->status !== 'running';
    }

    /** Covers state-changing actions (start/pause/resume/blacklist/upload) that aren't plain CRUD and shouldn't inherit update()'s "not running" restriction. */
    public function manage(User $user, ?Campaign $campaign = null): bool
    {
        return $user->hasPermission('campaigns.manage');
    }
}
