<?php

namespace App\Services\Conversations;

use App\Models\Contact;

/**
 * Single source of truth for the "is this a real block or a transient failure"
 * decision — used by both inbound webhook status updates and campaign send
 * failures, which used to duplicate this classification independently.
 */
class BlacklistPolicyService
{
    /** Meta error codes that mean the user actually blocked the business (permanent). */
    private const PERMANENT_BLOCK_CODES = [131026, 368];

    public function isPermanentBlock(?int $errorCode, ?string $errorMessage = null): bool
    {
        if ($errorCode !== null) {
            return in_array($errorCode, self::PERMANENT_BLOCK_CODES, true);
        }

        return $errorMessage !== null
            && (str_contains($errorMessage, '131026') || str_contains($errorMessage, 'حجب حسابك'));
    }

    public function applyFailure(Contact $contact, bool $isPermanent): void
    {
        if ($isPermanent) {
            $contact->markBlacklisted(null);

            return;
        }

        $contact->increment('fail_count');
        $contact->markBlacklisted(now()->addYear());
    }

    /** A contact that messages us back clearly hasn't blocked the business — clear any block. */
    public function clearIfMessaged(Contact $contact): void
    {
        if ($contact->is_blacklisted || $contact->blacklisted_until) {
            $contact->clearBlacklist();
        }
    }
}
