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

$contact = require('Contact.php');

return new KAAL\Middleware\Project($pdo, $cache, $contact);