<?php

//header("Cache-Control: public");
//header("Expires: " . gmdate("D, d M Y H:i:s", time() + 3600) . " GMT");

$path = trim($_SERVER['PATH_INFO']);
$type = substr($path, -3);
if ($type === '.js' || $type === 'mjs') {
    header('Content-Type: application/javascript; charset=utf-8');
} else if ($type === 'css') {
    header('Content-Type: text/css; charset=utf-8');
} else {
    http_response_code(404);
    exit(0);
}
header('Content-Encoding: gzip');

/* remove double slashes */
$parts = array_values(
    array_filter(
        explode('/', $path), 
        function($v) {
            if ($v === '') { return false; }
            if ($v === '.') { return false; }
            if ($v === '..') { return false; }
            return true;
        }
    )
);

$base = 'js';
$origin = array_shift($parts);
switch ($origin) {
    case 'admin':
        $base = 'admin/js';
        break;
    case 'vendor':
        $base = '..';
        break;
    case 'src':
        $base = 'js';
        break;
    case 'pkg':
        $base = 'node_modules';
        break;
    case 'conf':
        $base = 'conf';
        break;
}

$path = __DIR__ . '/' . $base . '/' . implode('/', $parts);
$origfmtime = filemtime($path);
if ($origfmtime === false) {
    http_response_code(404);
    exit(0);
}

$idx = hash('xxh64', $path);
$memcache = new Memcached();
$memcache->addServer('localhost', 11211);

$ftime = $memcache->get('JSCACHE/'. $idx . '/time');
if ($ftime === false || $origfmtime > intval($ftime)) {
    require 'vendor/autoload.php';
    if ($type === 'css') {
        $compiler = new MatthiasMullie\Minify\CSS();
    } else {
        $compiler = new MatthiasMullie\Minify\JS();
    }
    $compiler->add($path);
    $memcache->set('JSCACHE/' . $idx . '/content', $compiler->gzip(null));
    $memcache->set('JSCACHE/' . $idx . '/time', $origfmtime);
}
echo $memcache->get('JSCACHE/' . $idx . '/content');
exit(0);