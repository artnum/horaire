<?PHP
/* Hash functions don't need to be secure and collision are not revelant */
header('Cache-Control: no-cache; max-age=0');
header('Content-Type: application/json', true);

if (is_file('private/VERSION') && is_readable('private/VERSION')) {
   $version = file_get_contents('VERSION');
} else {
   exec('git rev-parse --verify HEAD', $output, $retval);

   if (intval($retval) == 0) {
      $version = $output[0];
   } else {
      $version = 'unknown version';
   }
}

$key = 'unconfigured key';
if (is_file('conf/location.ini') && is_readable('conf/location.ini')) {
   $key = hash_file('md5', 'conf/location.ini');
}
$revision = hash_hmac('md5', $version, $key);

echo '{ "revision": "'. $revision . '" }';
?>
