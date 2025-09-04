<?php

/**
 * Entry point of the API.
 */

namespace KAAL;

require_once __DIR__ . '/vendor/autoload.php';

use KAAL\KPJAPI;
use KAAL\AccessControl;
use KAAL\Auth;
use KAAL\Utils\Conf;
use KaalDB\PDO\PDO;
use KAAL\Backend\Cache;

$memusage = memory_get_peak_usage();
$start = microtime(true);
$load = sys_getloadavg();

$debugMode = intval(getenv('DEBUG')) > 0 ? true : false;

/* Load configuration */
$conf = new Conf(__DIR__ . '/conf/kaal.php');


/* Set API */
$api = new KPJAPI('japi.d/', $conf, $debugMode);
$logger = $api->getLogger();

/* Open database */
$pdo = PDO::getInstance(
    $api->conf('storage.pdo-string'),
    $api->conf('storage.user'),
    $api->conf('storage.password')
);

if ($load[0] > 0.8) {
    $logger->warning(
        'API V4::Load - waiting ...',
        [
            'memory' => $memusage,
            'load' => $load
        ]
    );
    usleep(100000);
}

$logger->info('API V4::Start', ['memory' => $memusage, 'load' => $load]);

/* Get Auth */
$auth = new Auth($pdo);
if (!$auth->check_auth($auth->get_auth_token())) {
    http_response_code(401);
    exit(0);
}

/* initialize RBAC, needed in order to set connection and all */
$rbac = new AccessControl(require __DIR__ . '/conf/roles.php', $pdo);

$crypto = new Crypto($conf->get('crypto.algo'));
$context = new Context(
    $pdo,
    $crypto,
    $conf,
    $rbac,
    $auth,
    Cache::getInstance(['host' => $conf->get('cache.host')]),
    $logger
);

$api->init($context);
$api->run();

$memusage = memory_get_peak_usage();
$stop = microtime(true);
$load = sys_getloadavg();
$logger->info(
    'API V4::Stats',
    [
        'memory' => $memusage,
        'time' => $stop - $start,
        'load' => $load
    ]
);
