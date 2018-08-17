<?PHP
require('PHP_XLSXWriter/xlsxwriter.class.php');

if (isset($_GET['pid']) || is_numeric($_GET['pid'])) {
   $query = 'SELECT * FROM projects
         LEFT JOIN htime ON htime.htime_project = projects.projects_id 
         LEFT JOIN person ON htime.htime_person = person.person_id
      WHERE projects_id=:pid';


   try {
      $db = new PDO('sqlite:../../db/horaire.sqlite3');
      $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      $st = $db->prepare($query);
      $st->bindValue(':pid', $_GET['pid'], PDO::PARAM_INT);
      $st->execute();
      $values = $st->fetchAll(PDO::FETCH_ASSOC);
   } catch (Exception $e) {
      die($e->getMessage());
   }


   $writer = new XLSXWriter();

   $writer->writeSheetHeader('Projet', array('Projet'=> 'string', 'Jour' => 'datetime', 'Temps [h]' => '0.00', 'Personne' => 'string'), array('widths'=>[25, 25, 10, 25]));

   foreach ($values as $row) {
      $date = (new DateTime($row['htime_day']))->format('Y-m-d H:i:s');
      $writer->writeSheetRow('Projet', array($row['projects_name'], $date, $row['htime_value'] / 3600, $row['person_name']));
   }

   $writer->writeSheetRow('Projet', array('', '', ''));
   $rc = $writer->countSheetRows('Projet');
   $writer->writeSheetRow('Projet', array('Total', '', '=SUM(C2:C' . ($rc - 1) . ')', ''));

   header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   $writer->writeToStdOut();
}
?>
