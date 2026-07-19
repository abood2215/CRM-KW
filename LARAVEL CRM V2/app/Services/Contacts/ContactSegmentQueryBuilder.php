<?php

namespace App\Services\Contacts;

use App\Models\Contact;
use Illuminate\Database\Eloquent\Builder;

/**
 * Single source of truth for "which contacts match these segment criteria" — used both
 * by the live count preview (ContactController::segmentCount) and by actual campaign
 * recipient resolution (CampaignRecipientResolver), so the two can never disagree.
 */
class ContactSegmentQueryBuilder
{
    /**
     * @param  array{
     *     pipeline_stages?: array<int, string>,
     *     tags?: array<int, string>,
     *     sources?: array<int, string>,
     *     last_contacted_before?: string,
     *     last_contacted_after?: string,
     * }  $filters
     */
    public function build(array $filters): Builder
    {
        $query = Contact::query();

        if (! empty($filters['pipeline_stages'])) {
            $query->whereIn('pipeline_stage', $filters['pipeline_stages']);
        }

        if (! empty($filters['tags'])) {
            $tags = $filters['tags'];
            $query->where(function (Builder $q) use ($tags) {
                foreach ($tags as $tag) {
                    $q->orWhereJsonContains('tags', $tag);
                }
            });
        }

        if (! empty($filters['sources'])) {
            $query->whereIn('source', $filters['sources']);
        }

        // "Never contacted, or every conversation they have is older than this date."
        if (! empty($filters['last_contacted_before'])) {
            $before = $filters['last_contacted_before'];
            $query->where(function (Builder $q) use ($before) {
                $q->whereDoesntHave('conversations')
                    ->orWhereDoesntHave('conversations', fn (Builder $cq) => $cq->where('last_message_at', '>=', $before));
            });
        }

        if (! empty($filters['last_contacted_after'])) {
            $after = $filters['last_contacted_after'];
            $query->whereHas('conversations', fn (Builder $cq) => $cq->where('last_message_at', '>=', $after));
        }

        return $query;
    }
}
