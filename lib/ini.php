<?PHP

$defaultConf = array(
  'date-format' => 'long',
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
    $this->dbs = [];
    $this->vars = [];
  }

  function setVar($name, $value) {
    $this->vars[$name] = $value;
  }

  function getVar($name) {
    if (!isset($this->vars[$name])) { return null; }
    return $this->vars[$name];
  }

  function delVar($name) {
    unset($this->vars[$name]);
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

  function setDB ($ressource, $type, $readonly = false) {
    if (!isset($this->dbs[$type])) {
      $this->dbs[$type] = ['cro' => 0, 'crw' => 0, 'ro' => [], 'rw' => []];
    }
    $access = $readonly ? 'ro' : 'rw';
    $this->dbs[$type][$access][] = $ressource;
  }

  function getDB ($type, $readonly = false) {
    if (!isset($this->dbs[$type])) { return NULL; }
    $access = $readonly ? 'ro' : 'rw';
    if ($readonly && empty($this->dbs[$type]['ro'])) { $access = 'rw'; }
    if (empty($this->dbs[$type][$access])) { return NULL; }
    $current = $this->dbs[$type]['c' . $access];
    $ressource = $this->dbs[$type][$access][$current];
    $current++;
    if ($current >= count($this->dbs[$type][$access])) { $current = 0; }
    $this->dbs[$type]['c' . $access] = $current;
    return $ressource;
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
