<?php

namespace KAAL\Utils;

class AVS
{
    public static function toint(string $avs): int
    {
        return (int) str_replace('.', '', $avs);
        $avs = str_replace('.', '', $avs);
        $avsid = 0;
        for ($i = 0; $i < strlen($avs); $i++) {
            $avsid = $avsid * 10 + ((int)$avs[$i]);
        }
        return $avsid;
    }

    public static function format(string|int $avs): string
    {
        if (is_int($avs)) {
            $avs = self::tostring($avs);
        }
        return substr($avs, 0, 3) . '.' .
            substr($avs, 3, 4) . '.' .
            substr($avs, 7, 4) . '.' .
            substr($avs, 11, 2);
    }

    public static function tostring(int $avs): string
    {
        return (string) $avs;
    }

    /* AVS use EAN-13 checksum */
    public static function check(string|int $avs): bool
    {
        if (is_int($avs)) {
            $avs = self::tostring($avs);
        }
        $avs = str_replace('.', '', $avs);

        if (!ctype_digit($avs) || strlen($avs) !== 13) {
            return false;
        }
        /* code for switzerland */
        if (substr($avs, 0, 3) !== '756') {
            return false;
        }
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $d = (int)$avs[$i];
            $sum += $d * ($i % 2 === 0 ? 1 : 3);
        }
        $check = 10 - ($sum % 10);
        return $check === (int)$avs[12];
    }
}
