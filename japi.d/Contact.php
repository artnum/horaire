<?php
require_once(__DIR__ . '/../vendor/autoload.php');

use KAAL\Backend\Cache;
use KaalDB\LDAP\LDAP;

$ldap = LDAP::getInstance(
    $PJAPI->conf('addressbook.ldap.uri'),
    $PJAPI->conf('addressbook.ldap.auth')
);
$cache = Cache::getInstance(['host'=> $PJAPI->conf('cache.host')]);

return new KAAL\Middleware\Contact($PJAPI->conf('addressbook.basedn'), $ldap, $cache);