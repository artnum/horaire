<?php

namespace KAAL\Utils;

use Normalizer as StringNormalizer;

trait Normalizer
{
    public static function normalizeTimestamp(mixed $value): int
    {
        return self::normalizeInt($value);
    }
    public static function normalizeInt(mixed $value): int
    {
        if ($value === null || empty($value)) {
            return 0;
        }
        return filter_var($value, FILTER_VALIDATE_INT) !== false
            ? intval($value)
            : 0;
    }
    public static function normalizeString(mixed $value): string
    {
        if ($value === null || empty($value)) {
            return '';
        }
        return trim(StringNormalizer::normalize($value));
    }

    /**
     * Normalize date into Y-m-d format. Set to current day if conversion
     * fails.
     */
    public static function normalizeDate(mixed $value): string
    {
        if ($value === null || empty($value)) {
            return '';
        }
        $value = strtotime($value);
        return date('Y-m-d', $value ? $value : null);
    }

    public static function normalizeBool(mixed $value): bool
    {
        return $value ? true : false;
    }

    public static function normalizeFloat(mixed $value): float
    {
        if ($value === null || empty($value)) {
            return 0.0;
        }
        return filter_var($value, FILTER_VALIDATE_FLOAT) !== false
            ? floatval($value)
            : 0.0;
    }

    public static function normalizePhoneNumber(mixed $value): string
    {
        if ($value === null || empty($value)) {
            return '';
        }
        $value = self::normalizeString($value);

        /* TODO : fix phone number here */

        return $value;
    }
}
