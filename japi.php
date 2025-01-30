<?php
namespace KAAL;

require_once(__DIR__ . '/vendor/autoload.php');

use KAAL\KPJAPI;
use KAAL\AccessControl;
use KAAL\Auth;

$memusage = memory_get_peak_usage();
$start = microtime(true);
$load = sys_getloadavg();

/* initialize RBAC, needed in order to set connection and all */
$rbac = new AccessControl();

$api = new KPJAPI('japi.d/');
$logger = $api->getLogger();

if ($load[0] > 0.8) { 
    $logger->warning('API V4::Load - waiting ...', ['memory' => $memusage, 'load' => $load]);
    usleep(100000); 
}

$logger->info('API V4::Start', ['memory' => $memusage, 'load' => $load]);

use KaalDB\PDO\PDO;

$pdo = PDO::getInstance(
    $api->conf('storage.pdo-string'),
    $api->conf('storage.user'), 
    $api->conf('storage.password')
);

$auth = new Auth($pdo);
if (!$auth->check_auth($auth->get_auth_token())) {
    http_response_code(401);
    exit(0);
}

$api->init();
$api->run();

$memusage = memory_get_peak_usage();
$stop = microtime(true);
$load = sys_getloadavg();
$logger->info('API V4::Stats', ['memory' => $memusage, 'time' => $stop - $start, 'load' => $load]);