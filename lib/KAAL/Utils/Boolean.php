<?php

namespace KAAL\Utils;

class Boolean
{
    public static function or(mixed ...$args): mixed
    {
        foreach ($args as $arg) {
            if (!empty($arg) && $arg !== '' && $arg !== null && $arg !== false) {
                return $arg;
            }
        }
        return '';
    }
}
