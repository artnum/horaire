<?PHP
require('artnum/autoload.php');
require('../../../lib/ini.php');
require('../../../lib/dbs.php');
require('../../../lib/urldn.php');
require('../../../lib/auth.php');

require('../../vendor/autoload.php');
$BaseURL = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['SERVER_NAME'];

$ini_conf = load_ini_configuration();
$authpdo = init_pdo($ini_conf, 'authdb');
$KAuth = new KAALAuth($authpdo);

if (!$KAuth->check_auth($KAuth->get_auth_token(), $BaseURL . '/' . $_SERVER['REQUEST_URI'])) {
  http_response_code(401);
  exit(0);
}

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
define('CLIENT_CELL', 4);
define('TERM_CELL', 5);
define('AMOUNT_CELL', 6);
define('REP_CELL', 7);
define('TVA_CELL', 9);
define('RAPP_CELL', 10);
define('CURRENCY_CELL', 8);
define('DEL_CELL', 18);
define('PAY1_CELL', 13);
define('PAY2_CELL', 14);
define('PAY3_CELL', 15);
define('PAY4_CELL', 16);

$FactureIDMap = [];

function add_repartition ($row, $factureID, $fdb, $sameline = false) {
    $project = $row[PROJECT_CELL];

    $req = 'SELECT "project_id" FROM "project" WHERE "project_reference" LIKE :prj AND "project_deleted" IS NULL';
    $stmt = $fdb->prepare($req);
    $stmt->bindParam(':prj', $project, PDO::PARAM_STR);
    if($stmt->execute()) {
        $project = $stmt->fetch();
        if ($project) {
            if (!$sameline) {
                $tva = empty($row[TVA_CELL]) ? 7.7 : floatval($row[TVA_CELL]);
                $amount = empty($row[REP_CELL]) ? floatval($row[AMOUNT_CELL]) : floatval($row[REP_CELL]);
            } else {
                $amount = empty($row[REP_CELL]) ? floatval($row[AMOUNT_CELL]) : floatval($row[REP_CELL]);
                $tva = empty($row[TVA_CELL]) ? 7.7 : floatval($row[TVA_CELL]);
            }
            $id = $project[0];
            if (empty($tva)) { $tva = 7.7; }
            if (empty($amount)) { return 1; }
            
            $amount = round($amount / (1 + $tva / 100), 4); // calc back tva
            
            $req = 'INSERT INTO "repartition" ("repartition_facture", "repartition_project", "repartition_value", "repartition_tva") VALUES (:fact, :prj, :val, :tva)';
            $stmt = $fdb->prepare($req);
            $stmt->bindParam(':fact', $factureID, PDO::PARAM_INT);
            $stmt->bindParam(':prj', $id, PDO::PARAM_INT);
            $stmt->bindParam(':val', $amount, PDO::PARAM_STR);
            $stmt->bindParam(':tva', $tva, PDO::PARAM_STR);
            if($stmt->execute()) {
                return 0;
            } else {
                error_log(sprintf('"%s": %s', $stmt->errorInfo()[2], $row[PROJECT_CELL]));
                return 2;
            }
        }
    }
}

function cmp ($a, $b) {
    if ($a[1] === $b[1]) { return 0; }
    return ($a[1] < $b[1]) ? 1 : -1;
}

function guess_client ($client, $cdb) {
    $proximity = [];
    $conn = $cdb->readable();
    if (!$conn) { return $proximity; }
    if(preg_match_all('/([^\s]+)/', $client, $matches)) {
        if (!empty($matches[1])) {
            $filter = '';
            for($i = 0; $i < count($matches[1]); $i++) {
                $word = $matches[1][$i];
                $ascii = iconv('UTF-8', 'ASCII//TRANSLIT', $word);
                $filter .= sprintf('(|(displayname=*%s*)(o=*%s*)(cn=*%s*))', $word, $word, $word);
                if ($word !== $ascii) {
                    $filter .= sprintf('(|(displayname=*%s*)(o=*%s*)(cn=*%s*))', $ascii, $ascii, $ascii);
                }
            }
            $filter = '(|' . $filter . ')';
            $res = ldap_search($conn, $cdb->getBase(), $filter, ['dn', 'displayname', 'cn', 'o', 'l']);
            if ($res) {
                for ($entry = ldap_first_entry($conn, $res); $entry; $entry = ldap_next_entry($conn, $entry)) {
                    $dn = ldap_get_dn($conn, $entry);
                    $rdn = explode(',', $dn);
                    $urldn = 'Contact/' . rawurlencode($rdn[0]);
                    $e = [];
                    foreach (['displayname', 'cn', 'o'] as $attr) {
                        $val = @ldap_get_values($conn, $entry, $attr);
                        if ($val === false) { continue; } // attribute not available
                        $e[$attr] = $val[0];
                        $text = '';
                        $max = 0;
                        for ($i = 0; $i < $val['count']; $i++) {
                            similar_text($val[$i], $client, $perc);
                            if ($max < $perc) {
                                $max = $perc;
                                $text = $val[$i];
                            }
                        }
                        if (!isset($proximity[$urldn])) {
                            $proximity[$urldn] = [$text, $max];
                        } else {
                            if ($proximity[$urldn][1] > $perc) {
                                $proximity[$urldn] = [$text, $max];
                            }
                        }
                    }
                    $val = @ldap_get_values($conn, $entry, 'l');
                    if ($val !== false) { $e['l'] = $val[0]; }
                    $proximity[$urldn][0] = join(', ', $e);
                }
            }
        }
    } 
    uasort($proximity, 'cmp');
    return $proximity;
}

function add_bill ($rowId, $row, $fdb, $cdb, $type) {
    global $FactureIDMap;
    $newId = null;
    $out = ['type' => 'facture', 'id' => $newId, 'op' => 'add', 'success' => false];

    if (!empty($row[REP_CELL]) && !empty($row[PROJECT_CELL]) && !empty($FactureIDMap[$row[REF_CELL]])) {
        if(($ret = add_repartition($row, $FactureIDMap[$row[REF_CELL]], $fdb)) === 0) {
            return ['type' => 'repartition', 'op' => 'add', 'success' => true];
        } else {
            return ['type' => 'repartition', 'op' => 'add', 'success' => false, 'msg' => $ret === 1 ? 'Projet inconnu' : 'Erreur db' ];
        }
    }

    if (
        empty($row[DATE_CELL]) &&
        empty($row[REF_CELL]) &&
        empty($row[AMOUNT_CELL])
    )  {
        return false;
    }

    $client = $row[CLIENT_CELL];
    $dbclient = null;
    if (empty($client)) {
        $out['options'] = ['client' => false];
    } else {
        $proximity = guess_client($client, $cdb);
        if (count($proximity) === 0) {
            $out['options'] = ['client' => false, 'proximity' => [], 'original' => $client];
            // if none is found, use the textual client as it can be changed later
            $dbclient = $client;
        } else if(count($proximity) === 1) {
            reset($proximity); // first key because only one
            $dbclient = key($proximity);
            $out['options'] = ['client' => true, 'proximity' => $proximity, 'original' => $client];
        } else {
            $out['options'] = ['client' => false, 'proximity' => $proximity, 'original' => $client];
        }
    }

    $date = \artnum\Date::parse($row[DATE_CELL]);
    $due = new DateTime();
    if (is_numeric($row[TERM_CELL])) {
        $due->add(new DateInterval('P' . $row[TERM_CELL] . 'D'));
    } else {
        $due->add(new DateInterval('P30D'));
    }
    $indate = new DateTime();
    $amount = 0;
    if (!empty($row[AMOUNT_CELL])) {
        $amount = floatval($row[AMOUNT_CELL]);
    }
    $ref = $row[REF_CELL];
    $currency = 'CHF';
    switch (strtolower($row[CURRENCY_CELL])) {
        default:
        case 'chf':
        case 'sfr':
        case 'fr':
        case 'francs':
        case 'franc':
            break;
        case 'euro':
        case '€':
        case 'eur':
            $currency = 'EUR';
            break;
    }

    $stmt = null;
    $fdb->beginTransaction();
    if ($dbclient === null) {
        $stmt = $fdb->prepare('INSERT INTO "facture" 
            ("facture_reference", "facture_currency", "facture_person", "facture_date", "facture_duedate", "facture_indate", "facture_amount", "facture_type")
            VALUES (:ref, :curr, \'\', :dat, :due, :ind, :amo, :typ)
        ');
        $stmt->bindValue(':ref', $ref, PDO::PARAM_STR);
        $stmt->bindValue(':curr', $currency, PDO::PARAM_STR);
        $stmt->bindValue(':dat', $date->format('c'), PDO::PARAM_STR);
        $stmt->bindValue(':due', $due->format('c'), PDO::PARAM_STR);
        $stmt->bindValue(':ind', $indate->format('c'), PDO::PARAM_STR);
        $stmt->bindValue(':amo', $amount, PDO::PARAM_STR);
        $stmt->bindValue(':typ', $type, PDO::PARAM_INT);
    } else {
        $stmt = $fdb->prepare('INSERT INTO "facture" 
            ("facture_reference", "facture_currency", "facture_person", "facture_date", "facture_duedate", "facture_indate", "facture_amount", "facture_type")
            VALUES (:ref, :curr, :per, :dat, :due, :ind, :amo, :typ)
        ');
        $stmt->bindValue(':ref', $ref, PDO::PARAM_STR);
        $stmt->bindValue(':curr', $currency, PDO::PARAM_STR);
        $stmt->bindValue(':per', $dbclient, PDO::PARAM_STR);
        $stmt->bindValue(':dat', $date->format('c'), PDO::PARAM_STR);
        $stmt->bindValue(':due', $due->format('c'), PDO::PARAM_STR);
        $stmt->bindValue(':ind', $indate->format('c'), PDO::PARAM_STR);
        $stmt->bindValue(':amo', $amount, PDO::PARAM_STR);
        $stmt->bindValue(':typ', $type, PDO::PARAM_INT);
    }
    $out['reference'] = $ref;
    if($stmt->execute()) {
        $out['success'] = true;
        $lid = $fdb->query('SELECT MAX("facture_id") FROM "facture"');
        $lid = $lid->fetch(PDO::FETCH_NUM);
        $out['id'] = $lid[0];
        $FactureIDMap[$ref] = $out['id'];
        $fdb->commit();
    } else {
        $fdb->rollBack();
    }
    return $out;
}

function add_rappel ($factureId, $rappelCount, $factureDb) {
    $now = (new DateTime())->format('c');
    if (empty($rappelCount) && !($rappelCount === 0)) { return false; }
    if (!is_numeric($rappelCount)) { return false; }
    if (intval($rappelCount) < 0) { return false;}
    try {
        $stmt = $factureDb->prepare('SELECT COUNT("rappel_id") AS "rappels" FROM "rappel" WHERE "rappel_facture" = :facture');
        $stmt->bindParam(':facture', $factureId, PDO::PARAM_INT);
        $stmt->execute();
        $rappel = $stmt->fetch();

        $factureDb->beginTransaction();
        if (intval($rappel['rappels']) < intval($rappelCount)) {
            for ($i = intval($rappel['rappels']); $i < intval($rappelCount); $i++) {
                $stmt = $factureDb->prepare('INSERT INTO "rappel" ("rappel_facture", "rappel_date") VALUES (:facture, :today)');
                $stmt->bindParam(':facture', $factureId, PDO::PARAM_INT);
                $stmt->bindParam(':today', $now, PDO::PARAM_STR);
                $stmt->execute();
            }
        } else if(intval($rappel['rappels']) > intval($rappelCount)) {
            $delta = intval($rappel['rappels']) - intval($rappelCount);
            $stmt = $factureDb->prepare('DELETE FROM "rappel" WHERE "rappel_facture" = :facture LIMIT :delta');
            $stmt->bindParam(':facture', $factureId, PDO::PARAM_INT);
            $stmt->bindParam(':delta', $delta, PDO::PARAM_INT);
            $stmt->execute();
        }
        $factureDb->commit();
        return true;
    } catch (Exception $e) {
        $factureDb->rollback();
        return false;
    }
}

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
$empty = 0;
$offset = 0;
$currentCount = 0;
foreach (['Créanciers', 'Débiteurs'] as $sheetname) {
    $AS = $SS->getSheetByName($sheetname);
    $offset = $currentCount + 1;
    $type = $sheetname === 'Créanciers' ? 1 : 2;
    for ($i = 10; $i < 5101; $i++) { // max size
        $currentCount = $i;
        $row = $AS->rangeToArray("A$i:S$i", null, false, false, false)[0];

        /* empty ID is add ... if more than three in a row, stop importation we reach the end */
        if (empty($row[ID_CELL])) { 
            $out[$i + $offset] = add_bill($i, $row, $db, $ldap_db, $type);
            if (!$out[$i + $offset]) {
                $out[$i + $offset] = ['type' => 'none'];
                $empty++;
            } else {
                $empty = 0;
                add_rappel($out[$i + $offset]['id'], $row[RAPP_CELL], $db);
                if ($out[$i + $offset]['type'] === 'facture' && (!empty($row[REP_CELL]) || !empty($row[PROJECT_CELL]))) {
                    if (add_repartition($row, $out[$i + $offset]['id'], $db, true) != 0) {
                        $out[$i + $offset]['repartition'] = false;
                    }
                }
            }
            if ($empty > 3) { break; }
            continue;
        }

        $id = explode(':', $row[ID_CELL]);
        if (trim($id[0]) === 'F') {
            // facture
            $stmt = $db->prepare('SELECT *,COALESCE((SELECT CAST(SUM("paiement_amount") AS FLOAT) FROM "paiement" WHERE "paiement_facture" = "facture_id"),0.0) AS facture_paid FROM facture WHERE facture_id = :id');
            $stmt->bindValue(':id', $id[1], PDO::PARAM_INT);
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
                    $FactureIDMap[$row[REF_CELL]] = $id[1];
                    $up[] = ['facture_reference', $row[REF_CELL], PDO::PARAM_STR];
                    $st_up[] = 'facture_reference = :facture_reference';
                } else {
                    $FactureIDMap[$facture['facture_reference']] = $id[1];
                }
                if ($facture['facture_currency'] !== strtolower($row[CURRENCY_CELL])) {
                    $up[] = ['facture_currency', $row[CURRENCY_CELL], PDO::PARAM_STR];
                    $st_up[] = 'facture_currency = :facture_currency';
                }
                if (floatval($facture['facture_amount']) !== floatval($row[AMOUNT_CELL])) {
                    $up[] = ['facture_amount', strval(floatval($row[AMOUNT_CELL])), PDO::PARAM_STR];
                    $st_up[] = 'facture_amount = :facture_amount';
                }
                $out[$i + $offset] = ['type' => 'facture', 'id' => $id[1], 'op' => 'update', 'success' => false];
            } else {
                if (intval($facture['facture_deleted']) === 0) { 
                    $up[] = ['facture_deleted', $todayInt, PDO::PARAM_INT];
                    $st_up[] = 'facture_deleted = :facture_deleted';
                    $out[$i + $offset] = ['type' => 'facture', 'id' => $id[1], 'op' => 'delete', 'success' => false];
                }
            }
            $out[$i + $offset]['reference'] = empty($row[REF_CELL]) ? $row[CLIENT_CELL] : $row[REF_CELL];

            /* client starts with / when we want to replace current */
            if (strpos($row[CLIENT_CELL], '/') === 0) {
                $proximity = guess_client(substr($row[CLIENT_CELL], 1), $ldap_db);
                if (count($proximity) === 0) {
                    $out[$i + $offset]['options'] = ['client' => false, 'proximity' => [], 'original' => substr($row[CLIENT_CELL], 1)];
                    // when not found, we set the textual client as it can be changed later
                    $up[] = ['facture_person', substr($row[CLIENT_CELL], 1), PDO::PARAM_STR];
                    $st_up[] = 'facture_person = :facture_person';
                } else if (count($proximity) === 1) {
                    reset($proximity);
                    $up[] = ['facture_person', key($proximity), PDO::PARAM_STR];
                    $st_up[] = 'facture_person = :facture_person';
                    $out[$i + $offset]['options'] = ['client' => true, 'proximity' => $proximity, 'original' => substr($row[CLIENT_CELL], 1)];
                } else if (count($proximity) > 1) {
                    $out[$i + $offset]['options'] = ['client' => false, 'proximity' => $proximity, 'original' => substr($row[CLIENT_CELL], 1)];
                    /* add raw value. if user select in the returned list, it will replace this one  */
                    $up[] = ['facture_person', substr($row[CLIENT_CELL], 1), PDO::PARAM_STR];
                    $st_up[] = 'facture_person = :facture_person';
                }
            }

            if (!empty($up)) {
                try {
                    $stmt = $db->prepare('UPDATE facture SET ' . implode(', ', $st_up) . ' WHERE facture_id = :id');
                    foreach ($up as $v) {
                        $stmt->bindValue(':' . $v[0], $v[1], $v[2]);
                    }
                    $stmt->bindValue(':id', $id[1], PDO::PARAM_INT);
                    $out[$i + $offset]['success'] = $stmt->execute();
                } catch(Exception $e) {
                    $out[$i + $offset]['success'] = false;
                }
            } else {
                $out[$i + $offset] = ['type' => 'none'];
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
                    $total_paid = strval($total_paid);
                    $stmt->bindParam(':id', $id[1], PDO::PARAM_INT);
                    $stmt->bindParam(':date', $todayStr, PDO::PARAM_STR);
                    $stmt->bindParam(':amount', $total_paid, PDO::PARAM_STR);
                    $stmt->execute();
                    $out[$i + 5101 + $offset] = ['type' => 'facture', 'id' => $id[1], 'op' => 'update', 'success' => true];
                } catch (Exception $e) {
                    $out[$i + 5101 + $offset] = ['type' => 'facture', 'id' => $id[1], 'op' => 'update', 'success' => false];;
                }
            }

            if (!empty($row[PROJECT_CELL])) {
                if (add_repartition($row, $id[1], $db, true) !== 0){
                    $out[$i + $offset]['repartition'] = false;
                }
            }
            add_rappel($id[1], $row[RAPP_CELL], $db);
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
                            $stmt->bindValue(':id', $id[1], PDO::PARAM_STR);
                            $stmt->execute();
                            $out[$i + $offset] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'delete', 'success' => true];
                        } catch (Exception $e) {
                            $out[$i + $offset] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'delete', 'success' => false];
                        }
                    } else {
                        if (abs(floatval($row[TVA_CELL]) - floatval($repartition['repartition_tva'])) >= 0.001) {
                            try {
                                /* tva update amount for obvious reason */                                
                                $tva = floatval($row[TVA_CELL]);
                                $amount =  floatval($row[REP_CELL]) / (1 + ($tva / 100));
                                $stmt = $db->prepare('UPDATE repartition SET repartition_tva = :tva, repartition_value = :amount WHERE repartition_id = :id');
                                $stmt->bindValue(':tva', strval($tva), PDO::PARAM_STR);
                                $stmt->bindValue(':id', $id[1], PDO::PARAM_INT);
                                $stmt->bindValue(':amount', strval($amount), PDO::PARAM_STR);
                                $stmt->execute();
                                $out[$i + $offset] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'update', 'success' => true];
                            } catch (Exception $e) {
                                $out[$i + $offset] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'update', 'success' => false];
                            }
                        } else {
                            /* update amount with old tva */
                            $oldamount = floatval($repartition['repartition_value']) + (floatval($repartition['repartition_value']) * floatval($repartition['repartition_tva']) / 100);
                            if (abs(floatval($row[REP_CELL]) - floatval($oldamount)) >= 0.0000001) {
                                try {
                                    $amount = floatval($row[REP_CELL]) / (1 + (floatval($repartition['repartition_tva']) / 100));
                                    /* stored in db without tva so calculate amount without tva  */
                                    $stmt = $db->prepare('UPDATE repartition SET repartition_value = :amount WHERE repartition_id = :id');
                                    $stmt->bindValue(':amount', strval($amount), PDO::PARAM_STR);
                                    $stmt->bindValue(':id', $id[1], PDO::PARAM_INT);
                                    $stmt->execute();
                                    $out[$i + $offset] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'update', 'success' => true];
                                } catch (Exception $e) {
                                    $out[$i + $offset] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'update', 'success' => false];
                                }
                            }
                        }
                    }
                }
            } catch (Exception $e) {
                $out[$i + $offset] = ['type' => 'repartition', 'id' => $id[1], 'op' => 'select', 'success' => false];
            }
        }
    }
}
echo json_encode($out);
?>