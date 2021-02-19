<?PHP
require('artnum/autoload.php');
require('lib/ini.php');
require('lib/dbs.php');

$ini_conf = load_ini_configuration();
$KConf = new KConf($ini_conf);

$r = new artnum\Random();
if (!file_exists(getcwd() .'/db/random-seed.txt')) {
   $r->str(256, getcwd() . '/db/random-seed.txt');
}

$http_request = new artnum\HTTP\JsonRequest();
$store = new artnum\JStore\Generic($http_request, true);

$pdo = init_pdo($ini_conf);
if (is_null($pdo)) {
  throw new Exception('Storage database not reachable');
  exit(0);
}
$store->add_db('sql', $pdo);

if (empty($ini_conf['addressbook']) || empty($ini_conf['addressbook']['servers'])) {
  throw new Exception('Addressbook not configured');
  exit(0);
}

$abServers = explode(',', $ini_conf['addressbook']['servers']);
if (count($abServers) <= 0) {
  throw new Exception('Addressbook not configured');
  exit(0);
}
$ldapServers = array();
foreach($abServers as $server) {
  $s = sprintf('ab-%s', trim($server));
  if (!empty($ini_conf[$s]) && !empty($ini_conf[$s]['uri'])) {
    $ldapServers[] = array(
      'uri' => $ini_conf[$s]['uri'],
      'ro' => isset($ini_conf[$s]['read-only']) ? boolval($ini_conf[$s]['read-only']) : true,
      'dn' => !empty($ini_conf[$s]['username']) ? $ini_conf[$s]['username'] : NULL,
      'password' => !empty($ini_conf[$s]['password']) ? $ini_conf[$s]['password'] : NULL
    );
  }
}

if (count($ldapServers) <= 0) {
  throw new Exception('Addressbook not configured');
  exit(0);
}

$ldap_db = new artnum\LDAPDB(
  $ldapServers,
  !empty($ini_conf['addressbook']['base']) ? $ini_conf['addressbook']['base'] : NULL
);
$store->add_db('ldap', $ldap_db);

$store->run($KConf);
?>
