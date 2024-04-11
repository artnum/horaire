<?php

namespace KAAL\Utils;

use MonoRef\Reference as BASEReference;
use Exception;
class Reference extends BASEReference
{
    public function get(string $key, string $base): string {
        if (!preg_match_all('/(\:[0-9a-zA-Z]+\:)/', $base, $matches)) {
            throw new Exception('Invalid reference base ' . $base);
        }
        $refId = $this->next($key);

        foreach ($matches[0] as $match) {
            if (str_starts_with($match, ':id')) {
                $f = str_replace(':id', '', $match);
                $f = str_replace(':', '', $f);
                echo $f;
                $base = str_replace($match, sprintf('%' . $f . 'd', $refId), $base);
            }
            switch($match) {
                case ':yyyy:': $base = str_replace($match, date('Y') , $base); break;
                case ':yy:': $base = str_replace($match, date('y') , $base); break;
                case ':mm:': $base = str_replace($match, date('m') , $base); break;
                case ':dd:': $base = str_replace($match, date('d') , $base); break;
                case ':hh:': $base = str_replace($match, date('H') , $base); break;
                case ':ii:': $base = str_replace($match, date('i') , $base); break;
                case ':ss:': $base = str_replace($match, date('s') , $base); break;
            }
        }

        return $base;
    }
}