<?php

namespace App\ValueObjects;

/**
 * Single source of truth for Kuwait phone normalization — the old app
 * duplicated this exact logic (strip non-digits, prefix 8-digit local
 * numbers with 965) independently across 6+ controllers/services/jobs.
 */
final class PhoneNumber
{
    private function __construct(private readonly string $value)
    {
    }

    public static function normalize(string $raw): string
    {
        $digits = preg_replace('/\D/', '', $raw) ?? '';

        if (strlen($digits) === 8) {
            $digits = '965'.$digits;
        }

        return $digits;
    }

    public static function make(string $raw): self
    {
        return new self(self::normalize($raw));
    }

    public function value(): string
    {
        return $this->value;
    }

    public function equals(PhoneNumber $other): bool
    {
        return $this->value === $other->value;
    }

    /** Kuwait numbers only: 965 + 8 digits. Used to reject foreign numbers from Kuwait-targeted imports/campaigns. */
    public static function isValidKuwaitNumber(string $raw): bool
    {
        $normalized = self::normalize($raw);

        return (bool) preg_match('/^965\d{8}$/', $normalized);
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
