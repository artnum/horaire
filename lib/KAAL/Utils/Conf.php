<?php

namespace KAAL\Utils;

class Conf
{
    protected array $conf;
    public function __construct(string $path)
    {
        $this->conf = include $path;
    }

    public function set(string $path, mixed $value): mixed
    {
        $parts = explode('.', $path);
        $conf = & $this->conf;
        foreach ($parts as $part) {
            if (isset($conf[$part])) {
                $conf = & $conf[$part];
            } else {
                $conf[$part] = [];
                $conf = & $conf[$part];
            }
        }
        $conf = $value;
        return $conf;
    }

    public function get(string $path): mixed
    {
        $parts = explode('.', $path);
        $conf = $this->conf;
        foreach ($parts as $part) {
            if (isset($conf[$part])) {
                $conf = $conf[$part];
            } else {
                return null;
            }
        }
        return $conf;
    }
}

