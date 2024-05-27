<?PHP
require('artnum/autoload.php');
require('../../../lib/ini.php');
require('../../../lib/dbs.php');
require('PHP_XLSXWriter/xlsxwriter.class.php');
/* select * from htime left join project on htime.htime_project = project.project_id left join person on htime.htime_person = person.person_id where person_id = 1 and htime_deleted is not null; */

$params = array();
$query = 'SELECT * FROM htime
LEFT JOIN project ON htime.htime_project = project.project_id
LEFT JOIN person ON htime.htime_person = person.person_id
LEFT JOIN process ON htime.htime_process = process.process_id
WHERE htime_deleted IS NULL AND project_deleted IS NULL AND process_deleted IS NULL';

$person = 'Tout';
if (isset($_GET['pid']) && is_numeric($_GET['pid'])) {
  $person = null;
  $query .= ' AND htime.htime_person = :pid';
  $params[] = array(':pid', $_GET['pid'], PDO::PARAM_INT);
}

foreach (array('from', 'to') as $t) {
  if (isset($_GET[$t])) {
    try {
      /* Validation by conversion back and forth */
      $d = new DateTime($_GET[$t]);
      $d = explode('T', $d->format('c'))[0];
      if ($t === 'from') {
        $query .= ' AND htime.htime_day >= :' . $t;
      } else {
        $query .= ' AND htime.htime_day <= :' . $t;
      }
      $params[] = array(':' . $t, $d, PDO::PARAM_STR);
    } catch(Exception $e) {
      /* do nothing */
      die ('Erreur format de date');
    }
  }
}

$query .= ' ORDER BY htime.htime_day ASC';
$ini_conf = load_ini_configuration();
$db = init_pdo($ini_conf);
if (is_null($db)) {
  throw new Exception('Storage database not reachable');
  exit(0);
}
try {
  $st = $db->prepare($query);
  foreach($params as $p) {
    $st->bindValue($p[0], $p[1], $p[2]);
  }
  if (!$st->execute()) {
    die ('Erreur base de donnée : "' . $st->errorInfo()[2] . '"');
  }
} catch (Exception $e) {
  die ('Erreur générale : "' . $e->getMessage() . '"');
}

try {
  $values = $st->fetchAll(PDO::FETCH_ASSOC);

  $writer = new XLSXWriter();
  
  $fmt = new IntlDateFormatter(
    'fr_CH',
    IntlDateFormatter::FULL,
    IntlDateFormatter::NONE,
    'Europe/Zurich',
    IntlDateFormatter::GREGORIAN
);

  $per_process = array();
  $per_person = array();
  /* Entrées */
  $writer->writeSheetHeader('Entrées', array('Reference' => 'string', 'Projet'=> 'string', 'Process' => 'string', 'Repas' => 'string', 'Déplacement' => 'number', 'Description' => 'string', 'Jour' => 'string', 'Temps [h]' => '0.00', 'Temps noté [h]' => '0.00', 'Personne' => 'string'), array('widths'=>[10, 35, 25, 10, 10, 25]));

  foreach ($values as $row) {
    if (is_null($person)) {
      $person = $row['person_name'];
    }
    
    if (!isset($per_process[$row['process_name']])) {
      $per_process[$row['process_name']] = 0;
    }
    if (!isset($per_person[$row['person_name']])) {
      $per_person[$row['person_name']] = 0;
    }
    if ($ini_conf['date-format'] === 'long') {
      $date = $fmt->format((new DateTime($row['htime_day'])));
    } else {
      $date = (new DateTime($row['htime_day']))->format('d.m.Y');
    }
    if (intval($row['project_uncount']) !== 0) {
      $value = 0;
    } else {
      $value = $row['htime_value'];
    }
    $writer->writeSheetRow('Entrées', array($row['project_reference'], $row['project_name'], $row['process_name'], $row['htime_dinner'] ? 'Oui': 'Non', $row['htime_km'], $row['htime_comment'] , $date, $value / 3600, $row['htime_value'] / 3600, $row['person_name']));
    
    $per_process[$row['process_name']] += $value;
    $per_person[$row['person_name']] += $value;
  }
  
  $writer->writeSheetRow('Entrées', array('', '', ''));
  $rc = $writer->countSheetRows('Entrées');
  $writer->writeSheetRow('Entrées', array('Total', '', '','=COUNTIF(D2:D' . ($rc - 1) . ',"Oui")', '=SUM(E2:E' . ($rc - 1) . ')', '', '', '=SUM(H2:H' . ($rc - 1) . ')', ''));
  
  /* Par processus */
   $writer->writeSheetHeader('Par processus', array('Process' => 'string', 'Temps [h]' => '0.00'), array('widths'=>[25,10]));
  foreach ($per_process as $process => $time) {
    $writer->writeSheetRow('Par processus', array($process, $time / 3600));
  }
  $writer->writeSheetRow('Par processus', array('', ''));
  $rc = $writer->countSheetRows('Par processus');
  $writer->writeSheetRow('Par processus', array('Total', '=SUM(B2:B' . ($rc - 1) . ')'));
  $writer->setTitle($person);
  if (method_exists($writer, 'setHeaderFooter')) {
    $writer->setHeaderFooter('c', 'Heures pour ' . $person);
    $writer->setHeaderFooter('c', '&[Tab]', true);
    $writer->setHeaderFooter('r', 'Page &[Page] sur &[Pages]', true);
  }
  header('Content-Disposition: inline; filename="' . $person . '.xlsx"');
  header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  $writer->writeToStdOut();
} catch(Exception $e) {
  die($e->getMessage());
}
?>
