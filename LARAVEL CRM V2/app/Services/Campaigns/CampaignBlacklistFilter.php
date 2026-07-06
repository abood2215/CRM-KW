<?php

namespace App\Services\Campaigns;

use App\Models\CampaignRecipient;

/**
 * Filters resolved campaign-recipient candidates against blacklist/opt-out
 * status and prior sends of the same template. Kept separate from
 * CampaignRecipientResolver so the eligibility rule is independently testable.
 */
class CampaignBlacklistFilter
{
    /**
     * @param  array<int, array{contact: \App\Models\Contact, name: ?string, variables: ?array}>  $candidates
     * @return array{0: array, 1: int} [eligible candidates, skipped count]
     */
    public function filter(array $candidates, ?string $templateName): array
    {
        $phones = array_map(fn ($c) => $c['contact']->phone, $candidates);

        $alreadySentPhones = [];
        if ($templateName && ! empty($phones)) {
            $alreadySentPhones = CampaignRecipient::whereIn('phone_snapshot', $phones)
                ->whereIn('status', ['sent', 'delivered', 'read'])
                ->whereHas('campaign', fn ($q) => $q->where('template_name', $templateName))
                ->pluck('phone_snapshot')
                ->flip()
                ->all();
        }

        $eligible = [];
        $skipped = 0;

        foreach ($candidates as $candidate) {
            $contact = $candidate['contact'];

            if ($contact->opt_out || $contact->is_blacklisted) {
                $skipped++;

                continue;
            }

            if (isset($alreadySentPhones[$contact->phone])) {
                $skipped++;

                continue;
            }

            $eligible[] = $candidate;
        }

        return [$eligible, $skipped];
    }
}
