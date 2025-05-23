<?PHP
require('artnum/autoload.php');
require('../../../lib/ini.php');
require('../../../lib/dbs.php');
require('../../../lib/urldn.php');
require('../../../vendor/autoload.php');

require('PHP_XLSXWriter/xlsxwriter.class.php');

use KAAL\Auth;

$BaseURL = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['SERVER_NAME'];

$ini_conf = load_ini_configuration();

$authpdo = init_pdo($ini_conf, 'authdb');
$KAuth = new Auth($authpdo);

if (!$KAuth->check_auth($KAuth->get_auth_token(), $BaseURL . '/' . $_SERVER['REQUEST_URI'])) {
  http_response_code(401);
  exit(0);
}

$project = 'tous';

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

 $bindings = [];

$query = 'SELECT * FROM project
        LEFT JOIN htime ON htime.htime_project = project.project_id
        LEFT JOIN person ON htime.htime_person = person.person_id
        LEFT JOIN process ON htime.htime_process = process.process_id
        LEFT JOIN travail ON htime.htime_travail = travail.travail_id
        WHERE htime.htime_deleted IS NULL';

if (isset($_GET['state'])) {
   switch (strtolower($_GET['state'])) {
      case 'all': break;
      case 'open':
      $project_name = 'Tous les projets ouverts';
      $query .= ' AND project.project_deleted IS NULL AND project.project_closed IS NULL';
      break;
      case 'closed':
      $project_name = 'Tous les projets clos';
      $query .= ' AND project.project_deleted IS NULL AND project.project_closed IS NOT NULL';
      break;
      case 'alive':
      $project_name = 'Tous les projets non supprimés';
      $query .= ' AND project.project_deleted IS NULL';
      break;
      case 'deleted':
      $project_name = 'Tous les projets supprimés';
      $query .= ' AND project.project_deleted IS NOT NULL';
      break;
   }
}

$atDate = null;
foreach($_GET as $key => $value) {
   if ($key === 'state') { continue; }
   switch ($key) {
      case 'at':
         try {
            $date = new DateTime($value);
            $value = $date->format('Y-m-d');
            $date->setTime(23, 59, 59);
            $value2 = $date->getTimestamp();
            $atDate = $date;
            $query .= ' AND (htime.htime_day <= :at OR project.project_created <= :at2)';
            $bindings['at'] = [$value, PDO::PARAM_STR];
            $bindings['at2'] = [$value2, PDO::PARAM_INT];
         } catch (Exception $e) {
            // nothing
         }
         break;
   }
}


try {
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $st = $db->prepare($query);
    if (!empty($bindings)) {
      foreach ($bindings as $key => [$value, $type]) {
        $st->bindValue(':' . $key, $value, $type);
      }
    }
} catch (Exception $e) {
    die($e->getMessage());
}


try {
   $st->execute();
   $writer = new XLSXWriter();

   $person_pricing = [];
   $per_entry = array();
   $per_project = array();
   $per_process = array();
   $per_person = array();
   /* Entrées */

   if (intval($ini_conf['bexio']['enabled']) != '0') {
      $bexioDB = new BizCuit\BexioCTX($ini_conf['bexio']['token']);
      $bexioDB->setSleep(5);
      $bxInvoice = new BizCuit\BexioInvoice($bexioDB);
      $bxContact = new BizCuit\BexioContact($bexioDB);
   }
   
   while (($row = $st->fetch(PDO::FETCH_ASSOC)) !== false) {
      set_time_limit(300);
      if (!isset($per_project[$row['project_id']])) {
         if ($row['project_manager']) {
            try {
               $stmt = $db->prepare('SELECT "person_name" FROM "person" WHERE "person_id" = :manager');
               $stmt->bindParam(':manager', $row['project_manager'], PDO::PARAM_INT);
               $stmt->execute();
               $manager = $stmt->fetch();
               if ($manager[0]) {
                  $row['project_manager'] = $manager[0];
               }
            } catch (Exception $e) {
               $row['project_manager'] = '';
            }

         }

         $row['project_client'] = '';
         if (intval($ini_conf['bexio']['enabled']) != '0'
               && str_starts_with(trim($row['project_client']), 'Contact/@bx_')) {
            try {
               $bxContactId = substr(trim($row['project_client']), 12);
               set_time_limit(300);
               $bxContactData = $bxContact->get($bxContactId);
               $row['project_client'] = $bxContactData->name_1;
            } catch (Exception $e) {
               $row['project_client'] = $row['project_client'] . ' (inconnu)';
               error_log($e->getMessage());
            }
         } else {
            $ldap = $ldap_db->_con();
            $res = @ldap_read($ldap, attrLessUrl2db($row['project_client'], $ldap_db->getBase()), '(objectclass=*)', ['displayname', 'givenname', 'sn', 'o']);
            if ($res) {
               $entries = ldap_get_entries($ldap, $res);
               if ($entries['count'] > 0) {
                  $entry = $entries[0];
                  
                  if (!isset($entry['displayname'])) { $entry['displayname'] = ['count' => 0]; }
                  if (!isset($entry['o'])) { $entry['o'] = ['count' => 0]; }
                  if (!isset($entry['sn'])) { $entry['sn'] = ['count' => 0]; }
                  if (!isset($entry['givenname'])) { $entry['givenname'] = ['count' => 0]; }

                  if ($entry['displayname']['count'] > 0) {
                     $row['project_client'] = trim($entry['displayname'][0]);
                  } else if ($entry['o']['count'] > 0) {
                     $row['project_client'] = trim($entry['o'][0]);
                  } else if ($entry['givenname']['count'] > 0 || $entry['sn']['count'] > 0) {
                     $name = $entry['givenname']['count'] > 0 ? $entry['givenname'][0] : '';
                     $name .= $name !== '' ? ' ' : '';
                     $name .= $entry['sn']['count'] > 0 ? $entry['sn'][0] : '';
                     $row['project_client'] = trim($name);
                  }
               }
            }
         }

         $created = new DateTime();
         try {
            $created = new DateTime("@$row[project_created]");
         } catch(Exception $e) {
            /* do nothing */
         }

         $per_project[$row['project_id']] = array(
            'reference' => $row['project_reference'],
            'client' => $row['project_client'],
            'name' => $row['project_name'], 
            'price' => $row['project_price'], 
            'firstdate' => null, 
            'lastdate' => null, 
            'time' => 0, 
            'workcost' => 0, 
            'id' => $row['project_id'],
            'closed' => $row['project_closed'],
            'created' => $created,
            'manager' => $row['project_manager']
         ); 
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
     
     if ($row['htime_id']) {
         $datetime = new DateTime($row['htime_day']);
         $date = $datetime->format('Y-m-d');

         if ($atDate && $datetime->getTimestamp() <= $atDate->getTimestamp()) {
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

            $per_project[$row['project_id']]['extid'] = $row['project_extid'];
            $per_project[$row['project_id']]['time'] += $row['htime_value'];
            $per_project[$row['project_id']]['workcost'] += ($hours * $price);

            if (is_null($per_project[$row['project_id']]['firstdate'])) { $per_project[$row['project_id']]['firstdate'] = $datetime; }
            if (is_null($per_project[$row['project_id']]['lastdate'])) { $per_project[$row['project_id']]['lastdate'] = $datetime; }

            if ($datetime->getTimestamp() < $per_project[$row['project_id']]['firstdate']->getTimestamp()) {
            $per_project[$row['project_id']]['firstdate'] = $datetime; 
            }
            if ($datetime->getTimestamp() > $per_project[$row['project_id']]['lastdate']->getTimestamp()) {
            $per_project[$row['project_id']]['lastdate'] = $datetime; 
            } 
         }
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
     /* Par projet */
  
   $writer->writeSheetHeader('Par projet', [
      'Reference' => 'string', 
      'Nom' => 'string',
      'Client' => 'string',
      'Chef projet' => 'string',
      'Nombre d\'heures H' => '0.00', 
      'Main d\'œuvre CHF HT' => 'price',
      'Créancier CHF HT' => 'price',
      'Prix de revient CHF HT' => 'price',
      'Prix vendu CHF HT' => 'price',
      'Résultat CHF HT' => 'price',
      'Résultat %' => '0.0%',
      'Débiteur CHF HT' => 'price',
      'Travaux en cours CHF HT' => 'price',
      'État' => 'string',
      'Ouverture' => 'date',
      'Première entrée' => 'date', 
      'Dernière entrée' => 'date', 
   ], ['widths' => [ 10, 40, 20 ]]);
   foreach ($per_project as $project) {
      $amount = [ 'creancier' => 0.0, 'debiteur' => 0.0];

      $invoices = [];
      if (intval($ini_conf['bexio']['enabled']) != '0') {
         if (isset($project['extid']) && $project['extid'] !== null) {
            $bxQuery = $bxInvoice->newQuery();
            $bxQuery->setWithAnyfields();
            $bxQuery->add('kb_item_status_id', '7', '>');
            $bxQuery->add('kb_item_status_id', '10', '<');
            if ($bindings['at']) {
               $bxQuery->add('is_valid_from', $bindings['at'][0], '<=');
            }
            $bxQuery->add('project_id', $project['extid'], '=');
            set_time_limit(300);
            $invoices = $bxInvoice->search($bxQuery);
         }
      }

      $bxReferences = [];
      foreach ($invoices as $invoice) {
         $reference = $invoice->document_nr;
         if (in_array(strval($reference), $bxReferences)) { continue; }
         $bxReferences[] = strval($reference);
         $amount['debiteur'] += floatval($invoice->total_net);
      }

      $repartitionQuery = 'SELECT 
            project_id,
            project_reference,
            facture_deleted,
            facture_reference,
            facture_type,
            repartition_value,
            repartition_ttc,
            repartition_tva,
            repartition_splittva,
            repartition_splitvalue
         FROM repartition 
         LEFT JOIN facture ON facture_id = repartition_facture 
         LEFT JOIN project ON project_id = repartition_project 
         WHERE "repartition_project" = :id AND "facture_deleted" = 0';
      if ($bindings['at']) {
         $repartitionQuery .= ' AND "facture_date" <= :at';
      }
      $repSt = $db->prepare($repartitionQuery);
      if ($bindings['at']) {
         $repSt->bindValue(':at', $bindings['at'][0], PDO::PARAM_STR);
      } 
      $repSt->bindValue(':id', $project['id'], PDO::PARAM_INT);
      if ($repSt->execute()) {
         while (($repData = $repSt->fetch(PDO::FETCH_ASSOC))) {
            if (intval($repData['facture_deleted']) !== 0) { continue; }
            if (in_array(strval($repData['facture_reference']), $bxReferences)) { continue; }

            $ttc = intval($repData['repartition_ttc']);
            $splitvalue = floatval($repData['repartition_splitvalue']);
            $splittva = floatval($repData['repartition_splittva']);
            $value = floatval($repData['repartition_value']);
            $tva = floatval($repData['repartition_tva']);
            
            $calcAmount = $ttc ? ($value / (1 + $tva / 100)) : $value;
            if ($splitvalue > 0) {
               $calcAmount = $ttc ? ($splitvalue / (1 + $splittva / 100)) : $splitvalue;
            }
            switch (intval($repData['facture_type'])) {
               case 1:
                  $amount['creancier'] += $calcAmount;
               break;
               case 2:
                  $amount['debiteur'] += $calcAmount;
               break;
               case 3:
               case 4:
                  break;

            }
         }
      }

      $project['total_cost'] = ($project['workcost'] + $amount['creancier']);
      $writer->writeSheetRow('Par projet', [
         $project['reference'], 
         $project['name'],
         $project['client'],
         $project['manager'],
         $project['time'] / 3600,
         $project['workcost'],
         $amount['creancier'],
         $project['total_cost'],
         $project['price'],
         $project['price'] - $project['total_cost'],
         ($project['total_cost'] != 0 && $project['price'] != 0) ? (($project['price'] - $project['total_cost']) / $project['price']) : 0,
         $amount['debiteur'],
         '=H' . ($writer->countSheetRows('Par projet') + 1) . '-L' . ($writer->countSheetRows('Par projet') + 1),
         $project['closed'] ? 'Fermé' : 'Ouvert',
         $project['created']->format('Y-m-d'),
         !is_null($project['firstdate']) ? $project['firstdate']->format('Y-m-d') : '',
         !is_null($project['lastdate']) ? $project['lastdate']->format('Y-m-d') : ''
      ]);
   }
   

   $writer->writeSheetRow('Par projet', array('', ''));
   $rc = $writer->countSheetRows('Par projet');
   $writer->writeSheetRow('Par projet', [
      'Total', 
      '', 
      '', 
      '', 
      '=SUM(E2:E' . ($rc - 1) . ')', 
      '=SUM(F2:F' . ($rc - 1) . ')',
      '=SUM(G2:G' . ($rc - 1) . ')', 
      '=SUM(H2:H' . ($rc - 1) . ')', 
      '=SUM(I2:I' . ($rc - 1) . ')', 
      '',
      '=SUM(K2:K' . ($rc - 1) . ')',
   ]);
  
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
   $SheetProcessus['content'][] = ['Total', '=SUM(B2:B' . ($rc - 1) . ')'];

   $SheetMateriel = [
      'header' => [ 'Référence' => 'string', 'Nom' => 'string', 'Prix unitaire' => 'price', 'Quantité' => '0.00', 'Personne' => 'string', '' => 'string', 'Total' => 'price'],
      'content' => []
   ];
   $materielMontant = 0;
   
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

   /* Toutes les entrées */
  $writer->writeSheetHeader('Entrées', array('Reference' => 'string', 'Projet'=> 'string', 'Process/Bon' => 'string', 'Jour' => 'date', 'Temps [h]' => '0.00', 'Prix horaire' => '0.00', 'Prix' => 'price', 'Personne' => 'string', 'Terminé' => 'datetime', 'Remarque' => 'string'), array('widths'=>[10, 40, 15, 15, 10, 15, 15, 100]));
  foreach($per_entry as $entry) {
      $writer->writeSheetRow('Entrées', array($entry[0], $entry[1], $entry[2], $entry[3], $entry[4], $entry[8], $entry[9], $entry[5], $entry[6], $entry[7]));
  }
  
   $writer->writeSheetRow('Entrées', array('', '', ''));
   $rc = $writer->countSheetRows('Entrées');
   $writer->writeSheetRow('Entrées', array('Total', '', '','', '=SUM(E2:E' . ($rc - 1) . ')', '=AVERAGE(F2:F' . ($rc - 1) . ')', '=SUM(G2:G' . ($rc - 1) . ')'));

  $date = new DateTime();
  if ($bindings['at']) {
    $date = new DateTime($bindings['at'][0]);
  }

   if (!empty($project_name)) {
      $project_name = $date->format('d.m.Y') . ' - ' . $project_name;
   } else {
      $project_name = $date->format('d.m.Y') . ' - Tous les projets';
   }
   $writer->setTitle($project_name);
   if (method_exists($writer, 'setHeaderFooter')) {
      if (count($per_project) === 1) {
         reset($per_project);
         $p = current($per_project);
         $writer->setHeaderFooter('l', 'Projet ' . $p['reference']);
         $writer->setHeaderFooter('r', $p['name']);
      } else {
         $writer->setHeaderFooter('c', $project_name);
         $writer->setHeaderFooter('r', 'Date ' . $date->format('d.m.Y'));
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
