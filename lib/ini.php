<?PHP

$defaultConf = array(
  'general' => array(
    'disable-locking' => 1
  ),
  'storage' => array(
    'pdo-string' => 'mysql:dbname=kaal;charset=utf8mb4;host=localhost',
    'user' => '',
    'password' => ''),
  'printing' => array(
    'print-command' => 'cat __FILE__ > /dev/null'
  ),
  'pictures' => array(
    'storage' => '/var/lib/kaal/'
  ),
  'files' => array(
    'storage' => '/var/lib/kaal/'
  )
);

class KConf {
  protected $IniValue;
  function __construct($ini) {
    $this->IniValue = $ini;
  }

  function get($path) {
    if (empty($path)) { return null; }
    $frags = explode('.', $path);
    $value = $this->IniValue;
    for ($attr = array_shift($frags); $attr; $attr = array_shift($frags)) {
      if (!isset($value[$attr]) || empty($value[$attr])) { return NULL; }
      $value = $value[$attr];
    }
    return $value;
  }
}

function load_ini_configuration() {
  global $defaultConf;
  if (($ini_file = getenv('KAAL_CONFIGURATION_FILE')) === FALSE ||
      (!is_file($ini_file) || !is_readable($ini_file))) {
    $path = dirname(__FILE__) . '/../conf/kaal.ini';
    if (is_file($path) && is_readable($path)) {
      $ini_file = $path;
    }
  }
  if (empty($ini_file)) {
    return $defaultConf;
  }
  $conf = parse_ini_file($ini_file, true);
  if ($conf === FALSE) {
    return $defaultConf;
  } else {
    return array_merge($defaultConf, $conf);
  }
}

?>
