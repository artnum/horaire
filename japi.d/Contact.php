<?php
require_once(__DIR__ . '/../vendor/autoload.php');

use KAAL\Backend\Cache;
use KaalDB\LDAP\LDAP;
use const KaalDB\LDAP\{
    LDAP_OPT_KAALDB_AUTH_USER,
    LDAP_OPT_KAALDB_AUTH_PASSWORD
};


$ldap = LDAP::getInstance(
    $PJAPI->conf('addressbook.ldap.uri'),
    [
        LDAP_OPT_KAALDB_AUTH_USER => $PJAPI->conf('addressbook.ldap.auth')['dn'],
        LDAP_OPT_KAALDB_AUTH_PASSWORD => $PJAPI->conf('addressbook.ldap.auth')['password']
    ]
);
$cache = Cache::getInstance(['host'=> $PJAPI->conf('cache.host')]);

return new KAAL\Middleware\Contact($PJAPI->conf('addressbook.basedn'), $ldap, $cache);