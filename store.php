<?PHP
require('artnum/autoload.php');
require('lib/ini.php');
require('lib/dbs.php');
require('conf/wesrv.php');
require('wesrv/lib/msg.php');
require('lib/user.php');
require('vendor/autoload.php');

use KAAL\Auth;
use artnum\JStore\ACL;
use artnum\JStore\SQLAudit;

$MSGSrv = new \wesrv\msg(WESRV_IP, WESRV_PORT, WESRV_KEY);
$ini_conf = load_ini_configuration();
$KConf = new KConf($ini_conf);

$http_request = new artnum\HTTP\JsonRequest();
$store = new artnum\JStore\Generic($http_request, true);
$pdo = init_pdo($ini_conf);
if (is_null($pdo)) {
  throw new Exception('Storage database not reachable');
  exit(0);
}
$store->add_db('sql', $pdo);

if (intval($KConf->get('bexio.enabled')) !== 0) {
  $bexioDB = new BizCuit\BexioCTX($KConf->get('bexio.token'));
  $store->add_db('bexio', $bexioDB);
  $KConf->setVar('bexioDB', $bexioDB);
}

$memcache = new Memcached();
$memcache->addServer('localhost', 11211);
$KConf->setVar('bxcache', [$memcache, $ini_conf['storage']['bxcache'], 60]);

$logpdo = init_pdo($ini_conf, 'logdb');

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

if (!empty($_SERVER['HTTP_X_CLIENT_ID'])) {
  $KConf->setVar('clientid', $_SERVER['HTTP_X_CLIENT_ID']);
} else {
  $KConf->setVar('clientid', '');
}

$user = new KUser($pdo);

/* Authentication */
$kauth = new Auth($pdo);
if ($http_request->getCollection() === '.auth') {
  $kauth->run($http_request->getItem(), $user);
  exit(0);
}

/* Authorization */
$acl = new ACL([]);
if (boolval($KConf->get('old-login')) === true) {
  $acl->addRule('Person', ACL::WHO_IS_EVERYONE, ACL::LEVEL_ANY, true);

  if (empty($_SERVER['HTTP_AUTHORIZATION'])) {
    if (!($http_request->getCollection() === 'Person' && $http_request->getItem() === '_query')) {
      http_response_code(401);
      exit(0);
    }
  } else {
    $authContent = explode(' ', $_SERVER['HTTP_AUTHORIZATION']);
    if (count($authContent) !== 2) {
      if (!($http_request->getCollection() === 'Person' && $http_request->getItem() === '_query')) {
        http_response_code(401);
        exit(0);
      }
    }

    if (!$kauth->check_auth(trim($authContent[1]), $http_request->getUrl())) {
      if (!($http_request->getCollection() === 'Person' && $http_request->getItem() === '_query')) {
        http_response_code(401);
        exit(0);
      }
    }
  }
} else {
  if (!$kauth->check_auth($kauth->get_auth_token())) {
    http_response_code(401);
    exit(0);
  }
}

$acl->addRule('*', ACL::WHO_IS_USER, ACL::LEVEL_ANY, true);

/* Accounting */
$audit = new SQLAudit($logpdo, true);
$store->init($KConf);
if ($acl->check($store->getCollection(), $kauth->get_current_userid(), $store->getOperation(), $store->getOwner())) {
  try {
    $store->setAcl($acl);
    [$request, $response] = $store->run($KConf);
    fastcgi_finish_request();
    $audit->audit($request, $response, $kauth->get_current_userid());
  } catch (Exception $e) {
    error_log($e->getMessage());
  }
  exit(0);
}

http_response_code(403);
?>
