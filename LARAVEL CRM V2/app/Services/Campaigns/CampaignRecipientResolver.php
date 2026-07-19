<?php

namespace App\Services\Campaigns;

use App\Models\Contact;
use App\Models\ContactList;
use App\Models\User;
use App\Services\Contacts\ContactSegmentQueryBuilder;
use App\ValueObjects\PhoneNumber;

/**
 * Turns raw campaign input (an explicit recipient array, a contact list, and/or segment
 * criteria) into find-or-create Contact rows, then hands them to CampaignBlacklistFilter.
 * Extracted from the 130-line inline block that used to live in
 * CampaignController::store().
 */
class CampaignRecipientResolver
{
    public function __construct(
        private readonly CampaignBlacklistFilter $blacklistFilter,
        private readonly ContactSegmentQueryBuilder $segmentQueryBuilder,
    ) {
    }

    /**
     * @param  array<int, array{phone: string, name?: string, variables?: array}>  $recipientInput
     * @return array{recipients: array, skipped: int}
     */
    public function resolve(array $recipientInput, ?int $contactListId, ?string $templateName, User $actor, ?array $segmentFilters = null): array
    {
        if (empty($recipientInput) && $contactListId) {
            $list = ContactList::with('contacts')->find($contactListId);
            if ($list) {
                foreach ($list->contacts as $contact) {
                    $recipientInput[] = ['phone' => $contact->phone, 'name' => $contact->name];
                }
            }
        }

        // Segment-matched contacts already exist (this never creates new ones the way a
        // pasted recipient list does), so they skip the phone-normalize/firstOrCreate loop
        // below and go straight to the blacklist filter.
        if (empty($recipientInput) && ! $contactListId && ! empty($segmentFilters)) {
            $candidates = $this->segmentQueryBuilder->build($segmentFilters)
                ->get()
                ->map(fn (Contact $contact) => ['contact' => $contact, 'name' => $contact->name, 'variables' => null])
                ->all();

            [$eligible, $filteredOut] = $this->blacklistFilter->filter($candidates, $templateName);

            return ['recipients' => $eligible, 'skipped' => $filteredOut];
        }

        if (empty($recipientInput)) {
            return ['recipients' => [], 'skipped' => 0];
        }

        $seenPhones = [];
        $candidates = [];
        $skipped = 0;

        foreach ($recipientInput as $r) {
            $rawPhone = $r['phone'] ?? null;
            if (! $rawPhone) {
                continue;
            }

            $phone = PhoneNumber::normalize($rawPhone);

            if (isset($seenPhones[$phone])) {
                $skipped++;

                continue;
            }
            $seenPhones[$phone] = true;

            $contact = Contact::firstOrCreate(
                ['phone' => $phone],
                ['name' => $r['name'] ?? $phone, 'user_id' => $actor->id, 'source' => 'campaign_import']
            );

            $candidates[] = ['contact' => $contact, 'name' => $r['name'] ?? $contact->name, 'variables' => $r['variables'] ?? null];
        }

        [$eligible, $filteredOut] = $this->blacklistFilter->filter($candidates, $templateName);

        return ['recipients' => $eligible, 'skipped' => $skipped + $filteredOut];
    }
}
