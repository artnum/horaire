<?php

namespace KAAL\Utils;

class Base64 {
    static public function encode(string $value):string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    static public function decode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/'));
    }
}