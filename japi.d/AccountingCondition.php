<?php
require_once(__DIR__ . '/../vendor/autoload.php');

use KaalDB\PDO\PDO;

$pdo = PDO::getInstance(
    $PJAPI->conf('storage.pdo-string'),
    $PJAPI->conf('storage.user'), 
    $PJAPI->conf('storage.password')
);

return new \KAAL\Middleware\AccountingCondition($pdo);