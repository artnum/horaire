<?php

namespace KAAL;

use KAAL\Backend\Cache;
use KaalDB\PDO\PDO;
use KAAL\Utils\Conf;
use Monolog\Logger;

class Context
{
    public int $machine_id;
    public function __construct(
        private PDO $pdo,
        private Crypto $crypto,
        private Conf $conf,
        private AccessControl $rbac,
        private Auth $auth,
        private Cache $cache,
        private Logger $logger
    ) {
        $this->machine_id = getenv('SNOWFLAKE64_MACHINE_ID');
        if ($this->machine_id === false) {
            $this->machine_id = getenv('SNOWFLAKE_MACHINE_ID');
        }
        if ($this->machine_id === false) {
            $this->machine_id = getenv('MACHINE_ID');
        }
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    public function crypto(): Crypto
    {
        return $this->crypto;
    }


    public function conf(): Conf
    {
        return $this->conf;
    }

    public function rbac(): AccessControl
    {
        return $this->rbac;
    }

    public function auth(): Auth
    {
        return $this->auth;
    }

    public function cache(): Cache
    {
        return $this->cache;
    }

    public function logger(): Logger
    {
        return $this->logger;
    }

}

