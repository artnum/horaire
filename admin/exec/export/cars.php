<?PHP


require('artnum/autoload.php');
require('../../../vendor/autoload.php');
require('../../../lib/ini.php');
require('../../../lib/dbs.php');
require('../../../lib/urldn.php');
require('../../../lib/auth.php');

require('PHP_XLSXWriter/xlsxwriter.class.php');

$project = 'tous';
$BaseURL = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['SERVER_NAME'];

$ini_conf = load_ini_configuration();

$authpdo = init_pdo($ini_conf, 'authdb');
$KAuth = new KAALAuth($authpdo);

if (!$KAuth->check_auth($KAuth->get_auth_token(), $BaseURL . '/' . $_SERVER['REQUEST_URI'])) {
  http_response_code(401);
  exit(0);
}
$KAIROSClient = new artnum\JRestClient($ini_conf['kairos']['url'] . '/store/');
$KAIROSClient->setAuth($ini_conf['security']['authproxy']);

$db = init_pdo($ini_conf);
if (is_null($db)) {
  throw new Exception('Storage database not reachable');
  exit(0);
}

$dateFormater = new IntlDateFormatter(
  'fr_CH',  IntlDateFormatter::FULL,
  IntlDateFormatter::FULL,
  'Europe/Zurich',
  IntlDateFormatter::GREGORIAN,
  'EEEE, dd MMMM y'
);

$carid = $_GET['cid'];

$writer = new XLSXWriter();

$query = "SELECT * FROM carusage 
    LEFT JOIN htime ON carusage_htime = htime_id 
    LEFT JOIN person on htime_person = person_id 
  WHERE carusage_car = :carid 
  ORDER BY htime_day DESC";
$stmt = $db->prepare($query);
$stmt->bindValue(':carid', $carid, PDO::PARAM_INT);
$stmt->execute();

$carname = '';
$writer->writeSheetHeader('Sheet1', ['Voiture' => 'string', 'Date' => 'string', 'Person' => 'string', 'KM' => 'string', 'Défaut' => 'string', 'Comment' => 'string' ]);
while ($entry = $stmt->fetch()) {
  $defect = '';
  if ($entry['carusage_defect'] != 0) {
    $status = $KAIROSClient->get($entry['carusage_defect'], 'Status');
    if (isset($status['data']) && isset($status['data'][0]) && isset($status['data'][0]['name'])) {
      $defect = $status['data'][0]['name'];
    }
  }
  $car = '';
  $status = $KAIROSClient->get($entry['carusage_car'], 'Status');
  if (isset($status['data']) && isset($status['data'][0]) && isset($status['data'][0]['name'])) {
    $car = $status['data'][0]['name'];
    $carname = $car;
  }
  $date = $dateFormater->format(new DateTime($entry['htime_day']));
  $writer->writeSheetRow('Sheet1', array($car, $date, $entry['person_name'], $entry['carusage_km'], $defect, $entry['carusage_comment']));
}
header('Content-Disposition: inline; filename="' .$carname . '.xlsx"');
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
$writer->writeToStdOut();
exit(0);