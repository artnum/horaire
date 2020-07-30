<?PHP
define('DB_PATH', 'sqlite:../../../db/horaire.sqlite3');

require('PHP_XLSXWriter/xlsxwriter.class.php');

$project = 'tous';
$db = null;
$allProjectsExport = false;
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

   try {
      $db = new PDO(DB_PATH);
      $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      $st = $db->prepare($query);
      $st->bindValue(':pid', $_GET['pid'], PDO::PARAM_INT);
   } catch (Exception $e) {
      die($e->getMessage());
   }
   $project_name = '';
} else {
   $allProjectsExport = true;

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
  
   $query_items = null;
   try {
      $db = new PDO(DB_PATH);
      $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      $st = $db->prepare($query);
   } catch (Exception $e) {
      die($e->getMessage());
   }
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
   /* Entrées */
   foreach ($values as $row) {
      if ($project_name === '') {
         $project_name = $row['project_reference'] . ' - ' . $row['project_name'];
      }
      if (!isset($per_project[$row['project_reference']])) {
         $per_project[$row['project_reference']] = array('reference' => $row['project_reference'], 'name' => $row['project_name'], 'firstdate' => null, 'lastdate' => null, 'time' => 0, 'workcost' => 0); 
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
  
   $project;
   /* Par projet */
   if ($allProjectsExport) {
      $writer->writeSheetHeader('Par projet', array('Reference' => 'string', 'Nom' => 'string', 'Première entrée' => 'date', 'Dernière entrée' => 'date', 'Heure [h]' => '0.00', 'Coût travail' => 'price'), array('widths' => [10, 60, 15, 15, 10]));
      foreach ($per_project as $project) {
         $writer->writeSheetRow('Par projet', array(
            $project['reference'], $project['name'],
            !is_null($project['firstdate']) ? $project['firstdate']->format('Y-m-d') : '',
            !is_null($project['lastdate']) ? $project['lastdate']->format('Y-m-d') : '',
            $project['time'] / 3600,
            $project['workcost']
         ));
      }

      $writer->writeSheetRow('Par projet', array('', ''));
      $rc = $writer->countSheetRows('Par projet');
      $writer->writeSheetRow('Par projet', array('Total', '', '', '', '=SUM(E2:E' . ($rc - 1) . ')', '=SUM(F2:F' . ($rc - 1) . ')'));
   } else {
      $project = current($per_project);
   }

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
   $factureAmount = 0;
   $amountByType = [0, 0, 0, 0];
   if (!$allProjectsExport) {
      $SheetFacture['header'] = ['N° de facture' => 'string', 'Montant HT' => 'price', 'TVA' => '#0.00', 'Montant TTC' => 'price', 'Facture' => 'string' ];
      $repSt = $db->prepare('SELECT * FROM "repartition" LEFT JOIN "facture" ON "facture_id" = "repartition_facture" WHERE "repartition_project" = :id AND "facture_deleted" = 0');
      $repSt->bindValue(':id', $row['project_id'], PDO::PARAM_INT);
      if ($repSt->execute()) {
         $line = 1;
         while (($repData = $repSt->fetch(PDO::FETCH_ASSOC))) {
            $reference = strval($repData['facture_reference']);
            $amount_ht = 0;
            $tva = 7.7;
            $type = '';
            switch (intval($repData['facture_type'])) {
               case 1:
                  $type = 'Débiteur';
                  $amount_ht = floatval($repData['repartition_value']);
                  $tva = floatval($repData['repartition_tva']);
               break;
               case 2:
                  $type = 'Créance';
                  $amount_ht = -floatval($repData['repartition_value']);
                  $tva = floatval($repData['repartition_tva']);
               break;
               case 3:
                  $type = 'Note de crédit';
                  $amount_ht = -floatval($repData['repartition_value']);
                  $tva = floatval($repData['repartition_tva']);
               break;
               case 4:
                  $type = 'Compensation';
                  $amount_ht = -floatval($repData['repartition_value']);
                  $tva = floatval($repData['repartition_tva']);
               break;

            }
            $factureAmount += ($amount_ht + ($amount_ht * $tva / 100));
            $amountByType[intval($repData['facture_type'])-1] += ($amount_ht + ($amount_ht * $tva / 100));
            $SheetFacture['content'][] = [$reference, $amount_ht, $tva, '=B'.($line+1). '+(B' . ($line+1) . '*C' . ($line+1) .'%)' , $type];

            $line++;
         }
         $SheetFacture['content'][] = ['', '', '', ''];
         $SheetFacture['content'][] = ['Totaux', '=SUM(B2:B' . $line .  ')', '', '=SUM(D2:D' . $line .  ')']; 
      }
   }

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

   if (!$allProjectsExport) {
      $writer->writeSheetRow('Résumé', ['Projet', $project['reference']], ['font-style' => 'bold']);
      $writer->writeSheetRow('Résumé', ['', $project['name']]);
      $writer->writeSheetRow('Résumé', []);
      $writer->writeSheetRow('Résumé', ['Coûts', '', '', $project['workcost'] + $factureAmount + $materielMontant], ['font-style' => 'bold'], ['string', '', '', 'price']);
      $writer->writeSheetRow('Résumé', []);
      $writer->writeSheetRow('Résumé', ['Travail', '', '', $project['workcost']], null, ['string', '', '', 'price']);
      $writer->writeSheetRow('Résumé', ['dont'], ['font-style' => 'italic']);
      foreach ($processus as $k => $v) {
         $writer->writeSheetRow('Résumé', ['', $k, $v], ['font-style' => 'italic'], ['', 'string', 'price']);
      }
      $writer->writeSheetRow('Résumé', ['Facture', '', '', $factureAmount], null, ['string', '', '', 'price']);
      $writer->writeSheetRow('Résumé', ['dont'], ['font-style' => 'italic']);
      foreach($amountByType as $type => $v) {
         switch ($type) {
            case 0:
               $writer->writeSheetRow('Résumé', ['', 'Débiteur', $v], ['font-style' => 'italic'], ['', 'string', 'price']);
            break;
            case 1:
               $writer->writeSheetRow('Résumé', ['', 'Créance', $v], ['font-style' => 'italic'], ['', 'string', 'price']);
            break;
            case 2:
               $writer->writeSheetRow('Résumé', ['', 'Note de crédit', $v], ['font-style' => 'italic'], ['', 'string', 'price']);
            break;
            case 3:
               $writer->writeSheetRow('Résumé', ['', 'Compensation', $v], ['font-style' => 'italic'], ['', 'string', 'price']);
            break;
         }
      }
      $writer->writeSheetRow('Résumé', ['Matériel', '', '', $materielMontant], null, ['string', '', '', 'price']);

   }
   
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
   $writer->writeSheetRow('Par personne', array('', ''));
   $rc = $writer->countSheetRows('Par personne');
   $writer->writeSheetRow('Par personne', array('Total', '=SUM(B2:B' . ($rc - 1) . ')'));

   if (!$allProjectsExport) {
      $writer->writeSheetHeader('Factures', $SheetFacture['header']);
      foreach ($SheetFacture['content'] as $row) {
         $writer->writeSheetRow('Factures', $row);
      }
   }

  /* Toutes les entrées */
  $writer->writeSheetHeader('Entrées', array('Reference' => 'string', 'Projet'=> 'string', 'Process/Bon' => 'string', 'Jour' => 'date', 'Temps [h]' => '0.00', 'Prix horaire' => '0.00', 'Prix' => 'price', 'Personne' => 'string', 'Terminé' => 'datetime', 'Remarque' => 'string'), array('widths'=>[10, 40, 15, 15, 10, 15, 15, 100]));
  foreach($per_entry as $entry) {
      $writer->writeSheetRow('Entrées', array($entry[0], $entry[1], $entry[2], $entry[3], $entry[4], $entry[8], $entry[9], $entry[5], $entry[6], $entry[7]));
  }
  
   $writer->writeSheetRow('Entrées', array('', '', ''));
   $rc = $writer->countSheetRows('Entrées');
   $writer->writeSheetRow('Entrées', array('Total', '', '','', '=SUM(E2:E' . ($rc - 1) . ')', '=AVERAGE(F2:F' . ($rc - 1) . ')', '=SUM(G2:G' . ($rc - 1) . ')'));


   header('Content-Disposition: inline; filename="' . $project_name . '.xlsx"');
   header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   $writer->writeToStdOut();
} catch(Exception $e) {
   die($e->getMessage());
}
?>
