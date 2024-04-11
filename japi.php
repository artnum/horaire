<?php
namespace KAAL;

require_once(__DIR__ . '/vendor/autoload.php');

use KAAL\KPJAPI;


$memusage = memory_get_peak_usage();
$start = microtime(true);
$load = sys_getloadavg();

$api = new KPJAPI('japi.d/');
$logger = $api->getLogger();

if ($load[0] > 0.8) { 
    $logger->warning('API V4::Load - waiting ...', ['memory' => $memusage, 'load' => $load]);
    usleep(100000); 
}

$logger->info('API V4::Start', ['memory' => $memusage, 'load' => $load]);

$api->init();
$api->run();

$memusage = memory_get_peak_usage();
$stop = microtime(true);
$load = sys_getloadavg();
$logger->info('API V4::Stats', ['memory' => $memusage, 'time' => $stop - $start, 'load' => $load]);