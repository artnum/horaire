<?php
require_once(__DIR__ . '/../vendor/autoload.php');

use KAAL\Backend\Cache;
use KaalDB\PDO\PDO;

$pdo = PDO::getInstance(
    $PJAPI->conf('storage.pdo-string'),
    $PJAPI->conf('storage.user'), 
    $PJAPI->conf('storage.password')
);
$cache = Cache::getInstance(['host'=> $PJAPI->conf('cache.host')]);

return new \KAAL\Middleware\AccountingDoc($pdo, $cache);