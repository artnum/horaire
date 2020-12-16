<?PHP
require('artnum/autoload.php');
require('../../../lib/ini.php');
require('../../../lib/dbs.php');
require('../../../lib/urldn.php');
require('../../vendor/autoload.php');

$ini_conf = load_ini_configuration();
$db = init_pdo($ini_conf);
if (is_null($db)) {
  throw new Exception('Storage database not reachable');
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
      'ro' => !empty($ini_conf[$s]['read-only']) ? boolval($ini_conf[$s]['read-only']) : true,
      'dn' => !empty($ini_conf[$s]['username']) ? $ini_conf[$s]['username'] : NULL,
      'password' => !empty($ini_conf[$s]['password']) ? $ini_conf[$s]['password'] : NULL
    );
  }
}

if (count($ldapServers) <= 0) {
  throw new Exception('Addressbook not configured');
  exit(0);
}

if (empty($_FILES['gfimport'])) {
    throw new Exception('No import file');
    exit(0);
}
if (!is_readable($_FILES['gfimport']['tmp_name'])) {
    throw new Exception('No import file');
    exit(0);
}

define('ID_CELL', 0);
define('DATE_CELL', 1);
define('REF_CELL', 2);
define('PROJECT_CELL', 3);
define('TERM_CELL', 5);
define('AMOUNT_CELL', 6);
define('REP_CELL', 7);
define('CURRENCY_CELL', 8);
define('DEL_CELL', 17);
define('PAY1_CELL', 12);
define('PAY2_CELL', 13);
define('PAY3_CELL', 14);
define('PAY4_CELL', 15);
$ldap_db = new artnum\LDAPDB(
   $ldapServers,
   !empty($ini_conf['addressbook']['base']) ? $ini_conf['addressbook']['base'] : NULL
 );

$Reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
$Reader->setReadDataOnly(true);
$SS = $Reader->load($_FILES['gfimport']['tmp_name']);

$AS = $SS->getActiveSheet();
$today = new DateTime();
$todayStr = $today->format('c');
$todayInt = $today->format('U');

$out = [];
for ($i = 10; $i < 5101; $i++) { // max size
    $row = $AS->rangeToArray("A$i:R$i", null, false, false, false)[0];

    /* we stop at first empty id */
    if (empty($row[ID_CELL])) { break; }

    $id = explode(':', $row[ID_CELL]);
    if (trim($id[0]) === 'F') {
        // facture
        $stmt = $db->prepare('SELECT *,COALESCE((SELECT CAST(SUM("paiement_amount") AS FLOAT) FROM "paiement" WHERE "paiement_facture" = "facture_id"),0.0) AS facture_paid FROM facture WHERE facture_id = :id');
        $stmt->bindParam(':id', $id[1], PDO::PARAM_INT);
        $stmt->execute();
        $facture = $stmt->fetch();
        
        $up = [];
        $st_up = [];
        if (empty(trim($row[DEL_CELL]))) {
            if (intval($facture['facture_deleted']) !== 0) { 
                $up[] = ['facture_deleted', 0, PDO::PARAM_INT];
                $st_up[] = 'facture_deleted = :facture_deleted';
            }
            if (strval($facture['facture_reference']) !== strval($row[REF_CELL])) {
                $up[] = ['facture_reference', $row[REF_CELL], PDO::PARAM_STR];
                $st_up[] = 'facture_reference = :facture_reference';
            }
            if ($facture['facture_currency'] !== strtolower($row[CURRENCY_CELL])) {
                $up[] = ['facture_currency', $row[CURRENCY_CELL], PDO::PARAM_STR];
                $st_up[] = 'facture_currency = :facture_currency';
            }
            if (floatval($facture['facture_amount']) !== floatval($row[AMOUNT_CELL])) {
                $up[] = ['facture_amount', strval(floatval($row[AMOUNT_CELL])), PDO::PARAM_STR];
                $st_up[] = 'facture_amount = :facture_amount';
            }
            $out[$i] = ['type' => 'facture', 'id' => $id[1], 'op' => 'update', 'success' => false];
        } else {
            if (intval($facture['facture_deleted']) === 0) { 
                $up[] = ['facture_deleted', $todayInt, PDO::PARAM_INT];
                $st_up[] = 'facture_deleted = :facture_deleted';
                $out[$i] = ['type' => 'facture', 'id' => $id[1], 'op' => 'delete', 'success' => false];
            }
        }
        if (!empty($up)) {
            try {
                $stmt = $db->prepare('UPDATE facture SET ' . implode(', ', $st_up) . ' WHERE facture_id = :id');
                foreach ($up as $v) {
                    $stmt->bindParam(':' . $v[0], $v[1], $v[2]);
                }
                $stmt->bindParam(':id', $id[1], PDO::PARAM_INT);
                $stmt->execute();
            } catch(Exception $e) {
                $out[$i]['success'] = false;
            }
        } else {
            unset($out[$i]); // nothing done 
        }

        $total_paid = 0;
        foreach ([PAY1_CELL, PAY2_CELL, PAY3_CELL, PAY4_CELL] as $pcell) {
            $val = trim($row[$pcell]);
            if (!empty($val)) {
                if (is_numeric($val)) {
                    $total_paid += floatval($val);
                } else {
                    $total_paid = floatval($facture['facture_amount']) - floatval($facture['facture_paid']);
                }
            }
        }
        if ($total_paid > floatval($facture['facture_amount']) - floatval($facture['facture_paid'])) {
            $total_paid = floatval($facture['facture_amount']) - floatval($facture['facture_paid']);
        }
        if ($total_paid > 0) {
            try {
                $stmt = $db->prepare('INSERT INTO paiement (paiement_facture, paiement_date, paiement_amount) VALUES (:id, :date, :amount);');
                $stmt->bindParam(':id', $id[1], PDO::PARAM_INT);
                $stmt->bindParam(':date', $todayStr, PDO::PARAM_STR);
                $stmt->bindParam(':amount', strval($total_paid), PDO::PARAM_STR);
                $stmt->execute();
                $out[$i + 5101] = ['type' => 'facture', 'id' => $id[1], 'op' => 'update', 'success' => true];
            } catch (Exception $e) {
                $out[$i + 5101] = ['type' => 'facture', 'id' => $id[1], 'op' => 'update', 'success' => false];;
            }
        }
    } else {
        try {
            $stmt = $db->prepare('SELECT * FROM repartition WHERE repartition_id = :id');
            $stmt->bindParam(':id', $id[1], PDO::PARAM_INT);
            $stmt->execute();
            $repartition = $stmt->fetch();
            if ($repartition) {
                if (!empty(trim($row[DEL_CELL]))) {
                    try {
                        $stmt = $db->prepare('DELETE FROM repartition WHERE repartition_id = :id');
                        $stmt->bindParam(':id', $id[1], PDO::PARAM_STR);
                        $stmt->execute();
                        $out[$i] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'delete', 'success' => true];
                    } catch (Exception $e) {
                        $out[$i] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'delete', 'success' => false];
                    }
                } else {
                    $amount = floatval($repartition['repartition_value']) + (floatval($repartition['repartition_value']) * floatval($repartition['repartition_tva']) / 100);
                    if (abs(floatval($row[REP_CELL])- floatval($amount)) >= 0.0000001) {
                        echo abs(floatval($row[REP_CELL])- floatval($amount)) . '<br>' . "\n";
                        try {
                            /* stored in db without tva so calculate amount without tva  */
                            $amount = floatval($row[REP_CELL])  / (1 + $repartition['repartition_tva'] / 100);
                            $stmt = $db->prepare('UPDATE repartition SET repartition_value = :amount WHERE repartition_id = :id');
                            $stmt->bindParam(':amount', strval($amount), PDO::PARAM_STR);
                            $stmt->bindParam(':id', $id[1], PDO::PARAM_INT);
                            $stmt->execute();
                            $out[$i] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'update', 'success' => true];
                        } catch (Exception $e) {
                            $out[$i] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'update', 'success' => false];
                        }
                    }
                }
            }
        } catch (Exception $e) {
            $out[$i] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'select', 'success' => false];
        }
    }
}

echo json_encode($out);
?>