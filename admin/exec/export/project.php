<?PHP
require('artnum/autoload.php');
require('../../../vendor/autoload.php');
require('../../../lib/ini.php');
require('../../../lib/dbs.php');
require('../../../lib/urldn.php');

require('PHP_XLSXWriter/xlsxwriter.class.php');

use KAAL\Auth;

$project = 'tous';
$BaseURL = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['SERVER_NAME'];

$ini_conf = load_ini_configuration();

$authpdo = init_pdo($ini_conf, 'authdb');
$KAuth = new Auth($authpdo);

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

$ldap_db = new artnum\LDAPDB(
   $ldapServers,
   !empty($ini_conf['addressbook']['base']) ? $ini_conf['addressbook']['base'] : NULL
 );

if (isset($_GET['pid']) && is_numeric($_GET['pid'])) {
   $query = 'SELECT * FROM project
         LEFT JOIN htime ON htime.htime_project = project.project_id
         LEFT JOIN person ON htime.htime_person = person.person_id
         LEFT JOIN process ON htime.htime_process = process.process_id
         LEFT JOIN travail ON htime.htime_travail = travail.travail_id
      WHERE project_id=:pid AND htime.htime_deleted IS NULL';
   $query_items = 'SELECT * FROM quantity
         LEFT JOIN item ON item.item_id = quantity.quantity_item
         LEFT JOIN process ON process.process_id = quantity.quantity_process
         LEFT JOIN person ON person.person_id = quantity.quantity_person
      WHERE quantity_project = :pid';
   $query_manager = 'SELECT person_name FROM project LEFT JOIN person ON project_manager = person_id WHERE project_id = :pid';
   try {
      $st = $db->prepare($query);
      $st->bindValue(':pid', $_GET['pid'], PDO::PARAM_INT);
   } catch (Exception $e) {
      die($e->getMessage());
   }
   $project_name = '';
} else {
   header('Location: proj.php');
   exit(0);
}

try {
   $st->execute();
   $values = $st->fetchAll(PDO::FETCH_ASSOC);
   
   $ist = null;
   if (count($values) > 0 && $query_items) {
      try {
         $ist = $db->prepare($query_items);
         $ist->bindValue(':pid', $_GET['pid'], PDO::PARAM_INT);
         $ist->execute();
      } catch (Exception $e) {
         $ist = null;
      }

   }

   $writer = new XLSXWriter();

   $person_pricing = [];
   $per_entry = array();
   $per_project = array();
   $per_process = array();
   $per_person = array();
   $manager = '';
   try {
      $stmanager = $db->prepare($query_manager);
      $stmanager->bindValue(':pid', $_GET['pid'], PDO::PARAM_INT);
      if ($stmanager->execute()) {
         $m = $stmanager->fetch(PDO::FETCH_ASSOC);
         if ($m && !empty($m['person_name'])) {
            $manager = $m['person_name'];
         }
      }
   } catch (Exception $e) {

   }
   /* Entrées */
   foreach ($values as $row) {
      if ($project_name === '') {
         $project_name = $row['project_reference'] . ' - ' . $row['project_name'];
      }
      if (!isset($per_project[$row['project_reference']])) {
         $per_project[$row['project_reference']] = array('reference' => $row['project_reference'], 'name' => $row['project_name'], 'price' => $row['project_price'], 'firstdate' => null, 'lastdate' => null, 'time' => 0, 'workcost' => 0, 'manager' => $manager); 
      }
      if (!isset($per_process[$row['process_name']])) {
         $per_process[$row['process_name']] = [0, 0];
      }
      if (!isset($per_person[$row['person_name']])) {
         $per_person[$row['person_name']] = 0;
      }

      if (!isset($person_pricing[$row['person_id']])) {
         $priceSt = $db->prepare('SELECT * FROM "prixheure" WHERE "prixheure_person" = :pid');
         $priceSt->bindValue(':pid', $row['person_id'], PDO::PARAM_INT);
         $person_pricing[$row['person_id']] = [];
         if($priceSt->execute()) {
            while(($price = $priceSt->fetch(PDO::FETCH_ASSOC))) {
               $person_pricing[$row['person_id']][] = [
                  'price' => floatval(($price['prixheure_value'])),
                  'date' => (new DateTime(explode('T', $price['prixheure_validity'])[0]))->format('Y-m-d')
               ];
            }
         }
      }

      $pb = '';
     if (isset($row['process_name'])) {
       $pb = $row['process_name'];
     }
     if (isset($row['travail_id'])) {
       if ($pb === '') {
         $pb = 'Bon ' . $row['project_reference'] . '.' . $row['travail_id'];
       } else {
         $pb .= '/' . $row['project_reference'] . '.' . $row['travail_id'];
       }
     }
     
     $datetime = new DateTime($row['htime_day']);
     $date = $datetime->format('Y-m-d');

     $phour = null;
     if (isset($person_pricing[$row['person_id']])) {
        foreach($person_pricing[$row['person_id']] as $line) {
           if ($line['date'] <= $date) {
               if ($phour === null) {
                  $phour = $line;
               } else {
                  if ($phour['date'] < $line['date']) {
                     $phour = $line;
                  }
               }
           }
        }
     }

     $hours = $row['htime_value'] / 3600;
     $price = $phour !== null ? $phour['price'] : 0.0;
     $per_entry[] =[
        $row['project_reference'],
        $row['project_name'],
        $pb,
        $date,
        $hours,
        $row['person_name'],
        is_null($row['project_closed']) ? '' : $row['project_closed'],
        $row['htime_comment'],
        $price,
        $price * $hours
     ];

      $per_process[$row['process_name']][0] += $row['htime_value'];
      $per_process[$row['process_name']][1] += $price * $hours;
      $per_person[$row['person_name']] += $row['htime_value'];
     
      $per_project[$row['project_reference']]['time'] += $row['htime_value'];
      $per_project[$row['project_reference']]['workcost'] += ($hours * $price);

      if (is_null($per_project[$row['project_reference']]['firstdate'])) { $per_project[$row['project_reference']]['firstdate'] = $datetime; }
      if (is_null($per_project[$row['project_reference']]['lastdate'])) { $per_project[$row['project_reference']]['lastdate'] = $datetime; }

      if ($datetime->getTimestamp() < $per_project[$row['project_reference']]['firstdate']->getTimestamp()) {
        $per_project[$row['project_reference']]['firstdate'] = $datetime; 
      }
      if ($datetime->getTimestamp() > $per_project[$row['project_reference']]['lastdate']->getTimestamp()) {
        $per_project[$row['project_reference']]['lastdate'] = $datetime; 
      } 
   }
  uasort($per_project, function ($a, $b) {
    if (ctype_digit($a['reference']) && ctype_digit($b['reference'])) {
      return intval($a['reference']) - intval($b['reference']);
    }
    if (ctype_digit($a['reference']) && !ctype_digit($b['reference'])) {
      return -1;
    }
    if (!ctype_digit($a['reference']) && ctype_digit($b['reference'])) {
      return 1;
    }
    return strcmp($a['reference'], $b['reference']);
  });
  
   $project = current($per_project);
   
   /* Par processus */
   $SheetProcessus = ['header' => [], 'content' => []];
   $SheetProcessus['header'] = ['Process' => 'string', 'Temps [h]' => '0.00', 'Coût' => 'price'];
   $processus = [];
   foreach ($per_process as $process => $value) {
      $SheetProcessus['content'][] = [$process, $value[0] / 3600, $value[1]];
      $processus[$process] = $value[1];
   }
   $SheetProcessus['content'][] = ['', ''];
   $rc = count($SheetProcessus['content']);
   $SheetProcessus['content'][] = ['Total', '=SUM(B2:B' . $rc . ')'];

   $SheetMateriel = [
      'header' => [ 'Référence' => 'string', 'Nom' => 'string', 'Prix unitaire' => 'price', 'Quantité' => '0.00', 'Personne' => 'string', '' => 'string', 'Total' => 'price'],
      'content' => []
   ];
   $materielMontant = 0;
   if ($ist) {
      $items = $ist->fetchAll(PDO::FETCH_ASSOC);
      if (count($items) > 0) {
         $line = 1;
         foreach ($items as $item) {
            $SheetMateriel['content'][] = [
               $item['item_reference'],
               $item['item_name'],
               $item['item_price'],
               $item['quantity_value'],
               $item['person_name'],
               '',
               $item['item_price'] * $item['quantity_value']];
            $materielMontant += $item['item_price'] * $item['quantity_value'];
            $line++;
         }
         $SheetMateriel['content'][] = ['','','','','','',''];
         $SheetMateriel['content'][] = ['', '', '', '', '', '', '=SUM(G2:G' . $line .  ')'];
      }
   } 

   /* Facture, unqiuement par projet */
   $factureCount = 0;
   $SheetFacture = ['header' => [], 'content' => []];
   $amountByType = [0, 0, 0, 0];
   
   $SheetFacture['header'] = [
      'N° de facture' => 'string',
      'Date' => 'date', 
      'Personne/société' => 'string', 
      'Montant HT' => 'price', 
      'TVA' => '#0.00', 
      'Montant TTC' => 'price',
      'Facture' => 'string', 
      'Paiement' => 'date' 
   ];
   $invoices = [];
   $line = 1;

   if (intval($ini_conf['bexio']['enabled']) != '0') {
      $bexioDB = new BizCuit\BexioCTX($ini_conf['bexio']['token']);
      $bexioDB->setSleep(5);
      $bxInvoice = new BizCuit\BexioInvoice($bexioDB);
      $bxContact = new BizCuit\BexioContact($bexioDB);

      if ($row['project_extid'] !== null) {
         $bxQuery = $bxInvoice->newQuery();
         $bxQuery->setWithAnyfields();
         $bxQuery->add('kb_item_status_id', '7', '>');
         $bxQuery->add('kb_item_status_id', '10', '<');
         $bxQuery->add('project_id', $row['project_extid'], '=');
         $invoices = $bxInvoice->search($bxQuery);
      }

      $bxReferences = [];
      foreach ($invoices as $invoice) {
         $reference = $invoice->document_nr;
         if (in_array(strval($reference), $bxReferences)) { continue; }
         $contact = $bxContact->get($invoice->contact_id);
         $facture_amount = floatval($invoice->total_net);
         $amount = floatval($invoice->total);
         $bxReferences[] = strval($reference);
         $SheetFacture['content'][] = [$reference, $invoice->is_valid_from, $contact->name_1, $facture_amount, '', $amount , 'Débiteur',  ''];
         $amountByType[1] += abs($facture_amount);
         $line++;
      }
   }
   
   $factureEndLine = 0;
   $repSt = $db->prepare('SELECT * FROM "repartition" 
      LEFT JOIN "facture" ON "facture_id" = "repartition_facture" 
      LEFT JOIN "qraddress" ON "facture_qraddress" = "qraddress_id" 
      WHERE "repartition_project" = :id AND "facture_deleted" = 0');
   $repSt->bindValue(':id', $row['project_id'], PDO::PARAM_INT);
   if ($repSt->execute()) {
      while (($repData = $repSt->fetch(PDO::FETCH_ASSOC))) {
         /* bexio integartion */
         if (intval($ini_conf['bexio']['enabled']) != '0') { 
            if (in_array(strval($repData['facture_reference']), $bxReferences)) { continue; } 
         }
         
         $ttc = false;
         if ($repData['repartition_ttc']) {
            $ttc = true;
         }

         $paydate = null;
         $paiementSt = $db->prepare('SELECT MAX(paiement_date) as "paiement_date" FROM paiement WHERE paiement_facture = :facture_id');
         $paiementSt->bindValue(':facture_id', $repData['facture_id'], PDO::PARAM_INT);
         if ($paiementSt->execute()) {
            $paiementData = $paiementSt->fetch(PDO::FETCH_ASSOC);
            if ($paiementData) {
               $paydate = new DateTime($paiementData['paiement_date']);
            }
         }
         $reference = strval($repData['facture_reference']);
         $facture_amount = 0;
         $tva = 7.7;
         $type = '';
         $date = new DateTime($repData['facture_date']);
         switch (intval($repData['facture_type'])) {
            case 1:
               $type = 'Créancier';
               $facture_amount = -floatval($repData['repartition_value']);
               $tva = floatval($repData['repartition_tva']);
            break;
            case 2:
               $type = 'Débiteur';
               $facture_amount = floatval($repData['repartition_value']);
               $tva = floatval($repData['repartition_tva']);
            break;
            case 3:
               $type = 'Note de crédit';
            case 4:
               if ($type === '') { $type = 'Compensation'; }
               $facture_amount = floatval($repData['repartition_value']);
               $tva = floatval($repData['repartition_tva']);
            break;

         }

         $ldap = $ldap_db->_con();
         if ($ldap && !empty($repData['facture_person'])) {
            $res = @ldap_read($ldap, url2dn($repData['facture_person'], $ldap_db->getBase()), '(objectclass=*)', ['displayname', 'givenname', 'sn', 'o']);
            if ($res) {
               $entries = ldap_get_entries($ldap, $res);
               if ($entries['count'] > 0) {
                  $entry = $entries[0];
                  
                  if (!isset($entry['displayname'])) { $entry['displayname'] = ['count' => 0]; }
                  if (!isset($entry['o'])) { $entry['o'] = ['count' => 0]; }
                  if (!isset($entry['sn'])) { $entry['sn'] = ['count' => 0]; }
                  if (!isset($entry['givenname'])) { $entry['givenname'] = ['count' => 0]; }

                  if ($entry['displayname']['count'] > 0) {
                     $repData['facture_person'] = trim($entry['displayname'][0]);
                  } else if ($entry['o']['count'] > 0) {
                     $repData['facture_person'] = trim($entry['o'][0]);
                  } else if ($entry['givenname']['count'] > 0 || $entry['sn']['count'] > 0) {
                     $name = $entry['givenname']['count'] > 0 ? $entry['givenname'][0] : '';
                     $name .= $name !== '' ? ' ' : '';
                     $name .= $entry['sn']['count'] > 0 ? $entry['sn'][0] : '';
                     $repData['facture_person'] = trim($name);
                  }
               }
            }
         } else {
            if (!empty($repData['qraddress_name'])) {
               $repData['facture_person'] = $repData['qraddress_name'];
            } else {
               $repData['facture_person'] = '';
            }

         }

         $amountByType[intval($repData['facture_type'])-1] += ($ttc ? (abs($facture_amount)  * (1 - $tva / 100)) : abs($facture_amount));
         $SheetFacture['content'][] = [
            $reference,
            $date->format('Y-m-d'),
            $repData['facture_person'],
            $ttc ? '=F' . ($line+1) . '/(1+E' . ($line+1) .'%)' : $facture_amount,
            $tva,
            $ttc ? $facture_amount : '=D'.($line+1). '+(D' . ($line+1) . '*E' . ($line+1) .'%)', 
            $type, 
            $paydate ? $paydate->format('Y-m-d') : ''];
         $line++;

         $splitvalue = floatval($repData['repartition_splitvalue']);
         if ($splitvalue !== 0.0) {
            if (intval($repData['facture_type']) === 1) { $splitvalue = -$splitvalue; }
            $splittva = floatval($repData['repartition_splittva']);
            $amountByType[intval($repData['facture_type'])-1] += ($ttc ? (abs($splitvalue)  * (1 - $splittva / 100)) : abs($splitvalue));
            $SheetFacture['content'][] = [
               $reference,
               $date->format('Y-m-d'),
               $repData['facture_person'],
               $ttc ? '=F' . ($line+1) . '/(1+E' . ($line+1) .'%)' : $splitvalue,
               $splittva,
               $ttc ? $splitvalue : '=D'.($line+1). '+(D' . ($line+1) . '*E' . ($line+1) .'%)', 
               $type, 
               $paydate ? $paydate->format('Y-m-d') : '',
               'FRAIS'
            ];
            $line++;
         }
      }
      $factureEndLine = $line;
      $SheetFacture['content'][] = ['', '', '', ''];
      $SheetFacture['content'][] = ['Totaux', '', '', '=SUM(D2:D' . $line .  ')', '', '=SUM(F2:F' . $line .  ')']; 
   }

   $total = floatval($project['workcost']) + floatval($amountByType[0]) + floatval($materielMontant);
   if ($total == 0) { $total = 1; }

   $coutLine = count($processus) + 13; 

   $line = 1;
   $writer->writeSheetRow('Résumé', ['Projet', $project['reference']], ['font-style' => 'bold']); $line++;
   $writer->writeSheetRow('Résumé', ['Responsable', $project['manager']]); $line++;
   $writer->writeSheetRow('Résumé', ['']); $line++;
   $writer->writeSheetRow('Résumé', ['', $project['name']]); $line++;
   $writer->writeSheetRow('Résumé', ['']); $line++;
   $materielMontantLine = $line;
   $writer->writeSheetRow('Résumé', [
      'Matériel',
      '',
      '',
      $materielMontant,
      '=D' . $line . '/D' . $coutLine,
   ], null, ['string', 'string', 'string', 'price', '0.00 %']); $line++;
   $writer->writeSheetRow('Résumé', ['']); $line++;
   $workcostLine = $line;
   $writer->writeSheetRow('Résumé', [
      'Main d\'œuvre',
      '', 
      '100%', 
      $project['workcost'], 
      '=IFERROR(D' . $line . '/D' . $coutLine . ',1)',
   ], null, ['string', 'string', 'string', 'price', '0.00 %', 'string']); $line++;
   $writer->writeSheetRow('Résumé', ['dont'], ['font-style' => 'italic']); $line++;
   
   $i = 10;
   $workcost = floatval($project['workcost']);
   if ($workcost == 0) { $workcost = 1; }
   foreach ($processus as $k => $v) {
      $writer->writeSheetRow('Résumé', [
         '',
         $k,
         '=IFERROR(D' . $line . '/D' . $workcostLine . ',1)',
         $v,
         '',
         '=IFERROR(D' . $line . '/D' . $coutLine . ',1)'
      ], ['font-style' => 'italic'], ['string', 'string', '0.00 %', 'price', 'string', '0.00 %']); $line++;
      $i++;
   }
   
   $writer->writeSheetRow('Résumé', ['']); $line++;
   $creancierLine = $line;
   $writer->writeSheetRow('Résumé', [
      'Créanciers',
      'HT',
      '',
      '=ABS(SUMIF(Factures!G2:G' . $factureEndLine . ', "Créancier", Factures!D2:D' . $factureEndLine . '))',
      '=IFERROR(D' . $line . '/D' . $coutLine . ',1)',
   ], null, ['string', 'string', 'string', 'price', '0.00 %']); $line++;
   $writer->writeSheetRow('Résumé', ['']); $line++;
   $costLine = $line;
   $writer->writeSheetRow('Résumé', [
      'Prix revient', 
      'HT', 
      '', 
      '=D' . $workcostLine . '+D' . $creancierLine . '+D' . $materielMontantLine, 
      '1'
   ], ['font-style' => 'bold'], ['string', 'string', 'string', 'price', '0.00 %']); $line++;
   $soldLine = $line;
   $writer->writeSheetRow('Résumé', ['Prix Vendu', '', '', $project['price']], null, ['string', 'string', 'string', 'price']); $line++;
   
   $writer->writeSheetRow('Résumé', ['Résultat [CHF]', '', '', '=D'. $soldLine . '-D' .$costLine], null, ['string', 'string', 'string', '0.00;[RED]-0.00']); $line++;

   $writer->writeSheetRow('Résumé', ['Résultat [%]', '', '', '=IFERROR(1-D' . $line - 3 . '/D' . $line - 2 .',-1)'], null, ['string', 'string', 'string', '0.00 %;[RED]-0.00%']);
   $writer->writeSheetRow('Résumé', ['']);
   $writer->writeSheetRow('Résumé', ['Débiteur', 'HT', '', '=ABS(SUMIF(Factures!G2:G' . $factureEndLine . ', "Débiteur", Factures!D2:D' . $factureEndLine . '))'], null, ['string', 'string', 'string', 'price']);
 
   $writer->writeSheetHeader('Par processus', $SheetProcessus['header'], ['widths'=>[25,10, 10]]);
   foreach($SheetProcessus['content'] as $row) {  
      $writer->writeSheetRow('Par processus', $row);
   }

   if (count($SheetMateriel['content']) > 0) {
      $writer->writeSheetHeader('Matériel', $SheetMateriel['header']);
      foreach ($SheetMateriel['content'] as $row) {
         $writer->writeSheetRow('Matériel', $row);
      }
   }

   /* Par personne */
   $writer->writeSheetHeader('Par personne', array('Personne' => 'string', 'Temps [h]' => '0.00'), array('widths' => [25, 10]));
   foreach ($per_person as $person => $time) {
      $writer->writeSheetRow('Par personne', array($person, $time / 3600));
   }
   $writer->writeSheetRow('Par personne', ['', '']);
   $rc = $writer->countSheetRows('Par personne');
   $writer->writeSheetRow('Par personne', array('Total', '=SUM(B2:B' . ($rc - 1) . ')'));

   
   $writer->writeSheetHeader('Factures', $SheetFacture['header']);
   foreach ($SheetFacture['content'] as $row) {
      $writer->writeSheetRow('Factures', $row);
   }

  /* Toutes les entrées */
  $writer->writeSheetHeader('Entrées', array('Reference' => 'string', 'Projet'=> 'string', 'Process/Bon' => 'string', 'Jour' => 'date', 'Temps [h]' => '0.00', 'Prix horaire' => '0.00', 'Prix' => 'price', 'Personne' => 'string', 'Terminé' => 'datetime', 'Remarque' => 'string'), array('widths'=>[10, 40, 15, 15, 10, 15, 15, 100]));
  foreach($per_entry as $entry) {
      $writer->writeSheetRow('Entrées', array($entry[0], $entry[1], $entry[2], $entry[3], $entry[4], $entry[8], $entry[9], $entry[5], $entry[6], $entry[7]));
  }
  
   $writer->writeSheetRow('Entrées', array('', '', ''));
   $rc = $writer->countSheetRows('Entrées');
   $writer->writeSheetRow('Entrées', array('Total', '', '','', '=SUM(E2:E' . ($rc - 1) . ')', '=AVERAGE(F2:F' . ($rc - 1) . ')', '=SUM(G2:G' . ($rc - 1) . ')'));

   $project_name = date('Y-m-d') . ' ' . $project_name;
   $writer->setTitle($project_name);
   if (method_exists($writer, 'setHeaderFooter')) {
      if (count($per_project) === 1) {
         reset($per_project);
         $p = current($per_project);
         $writer->setHeaderFooter('l', 'Projet ' . $p['reference']);
         $writer->setHeaderFooter('r', $p['name']);
      } else {
         $writer->setHeaderFooter('c', 'Tous les projets');
      }
      $writer->setHeaderFooter('c', '&[Tab]', true);
      $writer->setHeaderFooter('r', 'Page &[Page] sur &[Pages]', true);
   }

   header('Content-Disposition: inline; filename="' . $project_name . '.xlsx"');
   header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   $writer->writeToStdOut();
} catch(Exception $e) {
   die($e->getMessage());
}
?>
