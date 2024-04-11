<?php 

namespace KAAL\Backend;

use MonoRef\Backend\IStorage;
use MonoRef\Backend\Redis as MRBackend;

class Cache implements IStorage {
    private static Cache $obj;
    private MRBackend $MRBackend;

    public function __construct(array $conf) {
        $this->MRBackend = new MRBackend($conf);
    }

    public function increment(string $key, int $value = 1):int {
        return $this->MRBackend->increment($key, $value);
    }

    static function getInstance(array $conf) {
        if (empty(self::$obj)) {
            self::$obj = new Cache($conf);
        }
        return self::$obj;
    }
}