<?php
namespace KAAL\Backend;

use KAAL\KPJAPI;
use KaalDB\PDO\PDO;
use MonoRef\Reference;
use MonoRef\Backend\IStorage;
use Snowflake53\ID;
use Exception;
use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};


class Storage {
    use ID;
    protected PDO $pdo;
    protected Reference $ref;
    function __construct(KPJAPI|PDO $PJAPI, IStorage $cache) {
        try {
            $this->ref = new Reference($cache);
            if ($PJAPI instanceof KPJAPI) {
                $pdo = $PJAPI->conf('storage.pdo');
                if (!$pdo) {
                    $this->pdo = PDO::getInstance(
                        $PJAPI->conf('storage.pdo-string'),
                        $PJAPI->conf('storage.user'), 
                        $PJAPI->conf('storage.password')
                    );
                    $PJAPI->setConf('storage.pdo', $this->pdo);
                } else {
                    $this->pdo = $pdo;
                }
            } else {
                $this->pdo = $PJAPI;
            }
        } catch (Exception $e) {
            throw new Exception('Error initializing resource', ERR_INTERNAL, $e);
        }
    }
}