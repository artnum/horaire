<?PHP
require('PHP_XLSXWriter/xlsxwriter.class.php');

$project = 'tous';
if (isset($_GET['pid']) || is_numeric($_GET['pid'])) {
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
      $db = new PDO('sqlite:../../db/horaire.sqlite3');
      $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      $st = $db->prepare($query);
      $st->bindValue(':pid', $_GET['pid'], PDO::PARAM_INT);
   } catch (Exception $e) {
      die($e->getMessage());
   }
   $project = '';
} else {
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
        $query .= ' AND project.project_deleted IS NULL AND project.project_closed IS NULL';
        break;
      case 'closed':
        $query .= ' AND project.project_deleted IS NULL AND project.project_closed IS NOT NULL';
        break;
      case 'alive':
        $query .= ' AND project.project_deleted IS NULL';
        break;
      case 'deleted':
        $query .= ' AND project.project_deleted IS NOT NULL';
        break;
    }
  }
  
   $query_items = null;
   try {
      $db = new PDO('sqlite:../../db/horaire.sqlite3');
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

   $per_process = array();
   $per_person = array();
   /* Entrées */
   $writer->writeSheetHeader('Entrées', array('Reference' => 'string', 'Projet'=> 'string', 'Process/Bon' => 'string', 'Jour' => 'datetime', 'Temps [h]' => '0.00', 'Personne' => 'string', 'Terminé' => 'datetime', 'Remarque' => 'string'), array('widths'=>[25, 25, 25, 25, 25, 25, 25, 100]));
   foreach ($values as $row) {
      if ($project === '') {
         $project = $row['project_reference'] . ' - ' . $row['project_name'];
      }
      if (!isset($per_process[$row['process_name']])) {
         $per_process[$row['process_name']] = 0;
      }
      if (!isset($per_person[$row['person_name']])) {
         $per_person[$row['person_name']] = 0;
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
     
      $date = (new DateTime($row['htime_day']))->format('Y-m-d H:i:s');
      $writer->writeSheetRow('Entrées', array($row['project_reference'], $row['project_name'], $pb, $date, $row['htime_value'] / 3600, $row['person_name'], is_null($row['project_closed']) ? '' : $row['project_closed'], $row['htime_comment']));

      $per_process[$row['process_name']] += $row['htime_value'];
      $per_person[$row['person_name']] += $row['htime_value'];
   }

   $writer->writeSheetRow('Entrées', array('', '', ''));
   $rc = $writer->countSheetRows('Entrées');
   $writer->writeSheetRow('Entrées', array('Total', '', '','', '=SUM(E2:E' . ($rc - 1) . ')', ''));

   /* Par processus */
   $writer->writeSheetHeader('Par processus', array('Process' => 'string', 'Temps [h]' => '0.00'), array('widths'=>[25,10]));
   foreach ($per_process as $process => $time) {
      $writer->writeSheetRow('Par processus', array($process, $time / 3600));
   }
   $writer->writeSheetRow('Par processus', array('', ''));
   $rc = $writer->countSheetRows('Par processus');
   $writer->writeSheetRow('Par processus', array('Total', '=SUM(B2:B' . ($rc - 1) . ')'));

   /* Par personne */
   $writer->writeSheetHeader('Par personne', array('Personne' => 'string', 'Temps [h]' => '0.00'), array('widths'=>[25,10]));
   foreach ($per_person as $person => $time) {
      $writer->writeSheetRow('Par personne', array($person, $time / 3600));
   }
   $writer->writeSheetRow('Par personne', array('', ''));
   $rc = $writer->countSheetRows('Par personne');
   $writer->writeSheetRow('Par personne', array('Total', '=SUM(B2:B' . ($rc - 1) . ')'));

   if ($ist) {
      $items = $ist->fetchAll(PDO::FETCH_ASSOC);
      if (count($items) > 0) {
         $writer->writeSheetHeader('Matériel', 
            array(
               'Référence' => 'string', 
               'Nom' => 'string', 
               'Prix unitaire' => '0.00',
               'Quantité' => '0.00',
               'Personne' => 'string',
               '' => 'string',
               'Total' => '0.00'
            ));
         $line = 1;
         foreach ($items as $item) {
            $writer->writeSheetRow('Matériel', array(
               $item['item_reference'],
               $item['item_name'],
               $item['item_price'],
               $item['quantity_value'],
               $item['person_name'],
               '',
               '=' . $writer->xlsCell($line, 2) . '*' . $writer->xlsCell($line, 3)
            ));
            $line++;
         }
         $writer->writeSheetRow('Matériel', array('','','','','','',''));
         $writer->writeSheetRow('Matériel', array('', '', '', '', '', '', '=SUM(G2:G' . $line .  ')')); 
      }
   } 

   header('Content-Disposition: inline; filename="' . $project . '.xlsx"');
   header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   $writer->writeToStdOut();
} catch(Exception $e) {
   die($e->getMessage());
}
?>
