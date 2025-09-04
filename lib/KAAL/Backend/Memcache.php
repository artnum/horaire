<?php

namespace KAAL\Backend;

use Memcached;

class Memcache
{
    protected $timeout = 600; // 10 minutes
    public function __construct(protected Memcached $instance)
    {
    }

    public function set(string $key, mixed $value): mixed
    {
        $this->instance->set($key, $value, $this->timeout);
    }

    public function get(string $key): false|string
    {
        return false;
    }
}
