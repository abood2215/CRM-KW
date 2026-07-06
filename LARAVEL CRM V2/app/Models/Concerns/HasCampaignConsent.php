<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait HasCampaignConsent
{
    /** Contacts safe to target with a campaign send right now. */
    public function scopeCampaignEligible(Builder $query): Builder
    {
        return $query
            ->where('opt_out', false)
            ->where('is_blacklisted', false)
            ->where(function (Builder $q) {
                $q->whereNull('blacklisted_until')
                    ->orWhere('blacklisted_until', '<', now());
            });
    }

    public function markBlacklisted(?\DateTimeInterface $until = null): void
    {
        $this->update([
            'is_blacklisted' => true,
            'blacklisted_until' => $until,
        ]);
    }

    public function clearBlacklist(): void
    {
        $this->update([
            'is_blacklisted' => false,
            'blacklisted_until' => null,
            'fail_count' => 0,
        ]);
    }

    public function optOut(): void
    {
        $this->update([
            'opt_out' => true,
            'opt_out_date' => now(),
        ]);
    }
}
