<?php

namespace KAAL\Utils;

/**
 * A to Z base26 encoding/decoding. 
 * @package KAAL\Utils
 */
class Base26 {
    static public function encode (int $num):string {
        $res = '';
        for ($i = $num; $i >= 0;) {
            $res = chr(65 + ($i % 26)) . $res;
            $i = floor($i / 26) - 1;
        }
        return strtoupper($res);
    }
    static public function decode(string $str): int {
        $str = strtoupper($str);
        $res = 0;
        $len = strlen($str);
        for ($i = 0; $i < $len; $i++) {
            $res = ($res * 26) + (ord($str[$i]) - 64);
        }
        return $res - 1;
    }
}