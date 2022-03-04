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

$ldap_db = new artnum\LDAPDB(
   $ldapServers,
   !empty($ini_conf['addressbook']['base']) ? $ini_conf['addressbook']['base'] : NULL
 );

$SS = \PhpOffice\PhpSpreadsheet\IOFactory::load('./basefile.xlsx');

$now = new DateTime();
$ldap = $ldap_db->_con();
foreach(['Créanciers', 'Débiteurs'] as $sheetname) {
  $xlsRow = 10;
  $xlsSheet = $SS->getSheetByName($sheetname);
  $stmt;
  if (isset($_GET['paid'])) {
    $stmt = $db->prepare('SELECT * FROM facture WHERE facture_deleted = 0 AND facture_type = ' . ($sheetname === 'Créanciers' ? 1 : 2));
  } else {
    $stmt = $db->prepare('SELECT * FROM facture WHERE facture_deleted = 0 AND facture_type = ' . ($sheetname === 'Créanciers' ? 1 : 2));
  }
  $stmt->execute();
  while(($row = $stmt->fetch(\PDO::FETCH_ASSOC))!==FALSE) {

    $paid = 0;
    $paidStmt = $db->prepare('SELECT COALESCE(CAST(SUM("paiement_amount") AS FLOAT)) AS "facture_paid" FROM "paiement" WHERE "paiement_facture" = ' . $row['facture_id']);
    $paidStmt->execute();
    $paidRow = $paidStmt->fetch(\PDO::FETCH_ASSOC);
    $row['facture_paid'] = $paidRow['facture_paid'];
    if (isset($_GET['paid'])) {
      if ($row['facture_paid'] < $row['facture_amount']) { continue; }
    } else {
      if ($row['facture_paid'] >= $row['facture_amount']) { continue; }

    }



    $dateBill = new DateTime($row['facture_date']);
    $dateDue = new DateTime($row['facture_duedate']);
    $payTime = $dateBill->diff($dateDue);
    $overDue = $now->diff($dateDue);
    

    /*$rappelStmt = $db->prepare('SELECT * FROM facture WHERE facture_id IN (SELECT factureLien_source FROM factureLien WHERE factureLien_destination =:fid AND factureLien_type > 1) AND facture_deleted = 0');
    $rappelStmt->bindParam(':fid', $row['facture_id'], \PDO::PARAM_INT);
    $rappelStmt->execute();
    $rappel = 0;
    while ($rappelStmt->fetch() !== FALSE) {
      $rappel++;<
    }*/
    
    $rappelStmt = $db->prepare('SELECT COUNT("rappel_id") AS "rappels" FROM "rappel" WHERE "rappel_facture" = :facture');
    $rappelStmt->bindParam(':facture', $row['facture_id'], PDO::PARAM_INT);
    $rappelStmt->execute();
    $rrappel = $rappelStmt->fetch();
    $rappel = $rrappel['rappels'];

    $xlsSheet->setCellValue("A$xlsRow", 'F:' . $row['facture_id']);
    $xlsSheet->setCellValue("B$xlsRow", $dateBill);
    $xlsSheet->setCellValue("C$xlsRow", $row['facture_reference']);

    $person = '';
    if (strpos($row['facture_person'], 'Contact/') === 0) {
      $res = @ldap_read($ldap, url2dn($row['facture_person'], $ldap_db->getBase()), '(objectclass=*)', ['displayname', 'givenname', 'sn', 'o']);
      if ($res) {
        $entries = ldap_get_entries($ldap, $res);
        if ($entries['count'] > 0) {
          $entry = $entries[0];
          if (!empty($entry['displayname']) && $entry['displayname']['count'] > 0) {
            $person = trim($entry['displayname'][0]);
          } else if (!empty($entry['o']) &&$entry['o']['count'] > 0) {
            $person = trim($entry['o'][0]);
          } else if ((!empty($entry['givenname']) && $entry['givenname']['count'] > 0) || (!empty($entry['sn']) && $entry['sn']['count'] > 0)) {
            $name = !empty($entry['givenname']) && $entry['givenname']['count'] > 0 ? $entry['givenname'][0] : '';
            $name .= $name !== '' ? ' ' : '';
            $name .= !empty($entry['sn']) && $entry['sn']['count'] > 0 ? $entry['sn'][0] : '';
            $person = trim($name);
          }
      }
      }
    } else {
      $person = $row['facture_person'];
    }
    $xlsSheet->setCellValue("E$xlsRow", $person);

    $diff = $dateBill->diff($dateDue);
    $xlsSheet->setCellValue("F$xlsRow", $payTime->format('%a'));
    
    $xlsSheet->setCellValue("G$xlsRow", floatval($row['facture_amount']) - floatval($row['facture_paid']));
    if (floatval($row['facture_paid']) > 0) {
      $xlsSheet->setCellValue("L$xlsRow", floatval($row['facture_amount']));
    } else {
      $xlsSheet->setCellValue("L$xlsRow", '');
    }

    $xlsSheet->setCellValue("I$xlsRow", strtoupper($row['facture_currency']));
    $xlsSheet->setCellValue("K$xlsRow", intval($rappel));
    $fill = $xlsSheet->getStyle("K$xlsRow")->getFill();
    if (intval($rappel) === 1) {
      $fill->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID); 
      $fill->getStartColor()->setARGB('FFFCFF50');
    }
    if (intval($rappel) === 2) {
      $fill->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID); 
      $fill->getStartColor()->setARGB('FFFF9A4D');
    }
    if (intval($rappel) > 2) {
      $fill->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID); 
      $fill->getStartColor()->setARGB('FFFF4D4D');
    }
    $xlsSheet->setCellValue("L$xlsRow", intval($overDue->format('%r%a')));

    $xlsRow++;
    
    $repStmt = $db->prepare('SELECT * FROM repartition LEFT JOIN project ON repartition_project = project_id WHERE repartition_facture = :fid');
    $repStmt->bindParam(':fid', $row['facture_id'], \PDO::PARAM_INT);
    $repStmt->execute();
    while (($repRow = $repStmt->fetch(\PDO::FETCH_ASSOC)) !== FALSE) {
      $xlsSheet->setCellValue("A$xlsRow", 'R:' . $repRow['repartition_id']);
      $xlsSheet->setCellValue("B$xlsRow", $dateBill);
      $xlsSheet->setCellValue("C$xlsRow", $row['facture_reference']);
      $xlsSheet->setCellValue("D$xlsRow", $repRow['project_reference']);
      $xlsSheet->setCellValue("E$xlsRow", $person);
    
      $diff = $dateBill->diff($dateDue);
      $xlsSheet->setCellValue("F$xlsRow", $payTime->format('%a'));
      
      $projecRep = floatval($repRow['repartition_value']);
      $projecRep = $projecRep + $projecRep * floatval(($repRow['repartition_tva'])) / 100;
      $xlsSheet->setCellValue("H$xlsRow", $projecRep);

      $xlsSheet->setCellValue("I$xlsRow", strtoupper($row['facture_currency']));
      $xlsSheet->setCellValue("J$xlsRow", floatval($repRow['repartition_tva']));
      $xlsSheet->setCellValue("K$xlsRow", '');
      $xlsSheet->setCellValue("L$xlsRow", intval($overDue->format('%r%a')));
      $xlsRow++;
    }
  }
}

$SS->setActiveSheetIndexByName('Créanciers');
$SSWriter = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($SS, 'Xlsx');
$SSWriter->setPreCalculateFormulas(false);
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment;filename="GF-' . $now->format('c') . '.xlsx"');
header('Cache-Control: max-age=0');
$SSWriter->save('php://output');
?>