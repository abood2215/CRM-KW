<?php

namespace App\Policies;

use App\Models\Campaign;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class CampaignPolicy
{
    /** Users without campaigns.view_all only see campaigns they created — granted to every
     * existing role by default (see the migration that added this permission), so this only
     * actually restricts anyone once an admin deliberately unchecks it for a role. */
    public static function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if (! $user->hasPermission('campaigns.view_all')) {
            return $query->where('user_id', $user->id);
        }

        return $query;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Campaign $campaign): bool
    {
        return $user->hasPermission('campaigns.view_all') || $campaign->user_id === $user->id;
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
