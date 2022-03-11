<?PHP
$db = '../../db/horaire.sqlite3';
if (isset($argv[1])) {
   $db = $argv[1];
}
$db = new SQLite3($db);
$tables = array (
   'category' => array(
      'category_id' => SQLITE3_INTEGER,
      'category_name' => SQLITE3_TEXT,
      'category_description' => SQLITE3_TEXT,
      "category_created" => SQLITE3_INTEGER,
      "category_deleted"  => SQLITE3_INTEGER,
      "category_modified" => SQLITE3_INTEGER
   ),
   "quantity" => [
    "quantity_id" => SQLITE3_INTEGER,
    "quantity_value" => SQLITE3_FLOAT,
    "quantity_item" => SQLITE3_INTEGER,
    "quantity_project" => SQLITE3_INTEGER,
    "quantity_process" => SQLITE3_INTEGER,
    "quantity_person" => SQLITE3_INTEGER
   ],
   "item" => [
    "item_id" => SQLITE3_INTEGER,
    "item_reference" => SQLITE3_TEXT,
    "item_name" => SQLITE3_TEXT,
    "item_description" => SQLITE3_TEXT,
    "item_unit" => SQLITE3_TEXT,
    "item_price"  => SQLITE3_FLOAT,
    "item_details" => SQLITE3_TEXT,
    "item_category" => SQLITE3_INTEGER,
    "item_created" => SQLITE3_INTEGER,
    "item_deleted" => SQLITE3_INTEGER,
    "item_modified" => SQLITE3_INTEGER,
   ],
   "project" => [
    "project_id" => SQLITE3_INTEGER,
    "project_reference" => SQLITE3_TEXT,
    "project_name" => SQLITE3_TEXT,
    "project_closed" => SQLITE3_TEXT,
    "project_opened" => SQLITE3_TEXT,
    "project_targetEnd" => SQLITE3_TEXT,
    "project_deleted" => SQLITE3_INTEGER,
    "project_created" => SQLITE3_INTEGER,
    "project_modified" => SQLITE3_INTEGER,
    "project_uncount" => SQLITE3_INTEGER,
    "project_client" => SQLITE3_TEXT,
    "project_price" => SQLITE3_FLOAT,
    "project_manager" => SQLITE3_INTEGER
   ],
   "process" => [
    "process_id" => SQLITE3_INTEGER,
    "process_name" => SQLITE3_TEXT,
    "process_deleted" => SQLITE3_INTEGER,
    "process_created" => SQLITE3_INTEGER,
    "process_modified" => SQLITE3_INTEGER
   ],
   "htime" => [
    "htime_id" => SQLITE3_INTEGER,
    "htime_day"  => SQLITE3_TEXT,
    "htime_value" => SQLITE3_INTEGER,
    "htime_project" => SQLITE3_INTEGER,
    "htime_person" => SQLITE3_INTEGER,
    "htime_process" => SQLITE3_INTEGER,
    "htime_comment"  => SQLITE3_TEXT,
    "htime_other"  => SQLITE3_TEXT,
    "htime_created" => SQLITE3_INTEGER,
    "htime_deleted" => SQLITE3_INTEGER,
    "htime_modified" => SQLITE3_INTEGER,
    "htime_travail" => SQLITE3_INTEGER
   ],
   "person" => [
    "person_id"  => SQLITE3_INTEGER,
    "person_name" => SQLITE3_TEXT,
    "person_username" => SQLITE3_TEXT,
    "person_level"  => SQLITE3_INTEGER,
    "person_key" => SQLITE3_TEXT,
    "person_keyopt" => SQLITE3_TEXT,
    "person_deleted"  => SQLITE3_INTEGER,
    "person_created"  => SQLITE3_INTEGER,
    "person_modified" => SQLITE3_INTEGER,
    "person_disabled"  => SQLITE3_INTEGER,
    "person_efficiency"  => SQLITE3_FLOAT
   ],
   "travail" => [
        "travail_id"  => SQLITE3_INTEGER,
        "travail_reference" => SQLITE3_TEXT,
        "travail_meeting" => SQLITE3_TEXT,
        "travail_contact" => SQLITE3_TEXT,
        "travail_phone" => SQLITE3_TEXT,
        "travail_description" => SQLITE3_TEXT,
        "travail_project"  => SQLITE3_INTEGER,
        "travail_created"  => SQLITE3_INTEGER,
        "travail_modified" => SQLITE3_INTEGER,
        "travail_progress" => SQLITE3_INTEGER,
        "travail_closed"  => SQLITE3_INTEGER,
        "travail_time"  => SQLITE3_FLOAT,
        "travail_force"  => SQLITE3_FLOAT,
        "travail_end" => SQLITE3_TEXT,
        "travail_begin" => SQLITE3_TEXT,
        "travail_plan"  => SQLITE3_INTEGER,
        "travail_group" => SQLITE3_TEXT
   ],
   "rappel" => [
    "rappel_id"  => SQLITE3_INTEGER,
    "rappel_facture"  => SQLITE3_INTEGER,
    "rappel_date" => SQLITE3_TEXT,
    "rappel_type"  => SQLITE3_INTEGER,
    "rappel_delay"  => SQLITE3_INTEGER,
    "rappel_frais"  => SQLITE3_FLOAT,
    "rappel_cc"  => SQLITE3_INTEGER,
    "rappel_qrdata" => SQLITE3_TEXT
   ],
   "paiement" => [
        "paiement_id" => SQLITE3_INTEGER,
        "paiement_facture" => SQLITE3_INTEGER,
        "paiement_date" => SQLITE3_TEXT,
        "paiement_amount" => SQLITE3_FLOAT,
   ],
   "facture" => [
    "facture_id" => SQLITE3_INTEGER,
    "facture_reference" => SQLITE3_TEXT,
    "facture_currency" => SQLITE3_TEXT,
    "facture_date" => SQLITE3_TEXT,
    "facture_duedate" => SQLITE3_TEXT,
    "facture_indate" => SQLITE3_TEXT,
    "facture_amount" => SQLITE3_FLOAT,
    "facture_type" => SQLITE3_INTEGER,
    "facture_qrdata" => SQLITE3_TEXT,
    "facture_person" => SQLITE3_TEXT,
    "facture_comment" => SQLITE3_TEXT,
    "facture_deleted" => SQLITE3_INTEGER,
   ],
   "factureLien" => [
    "factureLien_id" => SQLITE3_INTEGER,
    "factureLien_source" => SQLITE3_INTEGER,
    "factureLien_destination" => SQLITE3_INTEGER,
    "factureLien_type" => SQLITE3_INTEGER,
    "factureLien_comment" => SQLITE3_TEXT
   ],
   "repartition" => [
       "repartition_id" => SQLITE3_INTEGER,
       "repartition_facture" => SQLITE3_INTEGER,
       "repartition_project" => SQLITE3_INTEGER,
       "repartition_travail" => SQLITE3_INTEGER,
       "repartition_value" => SQLITE3_INTEGER,
       "repartition_tva" => SQLITE3_FLOAT,
   ],
   "prixheure" => [
    "prixheure_id" => SQLITE3_INTEGER,
    "prixheure_person" => SQLITE3_INTEGER,
    "prixheure_value" => SQLITE3_FLOAT,
    "prixheure_validity" => SQLITE3_TEXT,
   ],
   "tseg" => [
    "tseg_id"  => SQLITE3_INTEGER,
    "tseg_date"  => SQLITE3_TEXT,
    "tseg_travail"  => SQLITE3_INTEGER,
    "tseg_time"  => SQLITE3_INTEGER,
    "tseg_person"  => SQLITE3_INTEGER,
    "tseg_efficiency"  => SQLITE3_FLOAT,
    "tseg_color" => SQLITE3_TEXT,
    "tseg_details"=> SQLITE3_TEXT,
    ]
);
echo "SET SQL_MODE=ANSI_QUOTES;";
echo "SET FOREIGN_KEY_CHECKS = 0;";

foreach ($tables as $name => $content) {
   $stmt = @$db->prepare('SELECT * FROM "' . $name . '"');
   if (!$stmt) { continue; }
   $res = @$stmt->execute();
   if (!$res) { continue; }

   $first = true;
   $values = array();
   $qhead = '';
   while($res && ($row = $res->fetchArray(SQLITE3_ASSOC)) != FALSE) {
      $v = array();
      $qhead = array();
      $keepRow = true;
      foreach ($row as $k => $value) {
         $col = true;
         if (empty($value)) {
            $col = false;
         }
         $type = SQLITE3_TEXT;
         if (isset($content[$k])) {
            $type = $content[$k];
         }
         if ($col) {
            switch($type) {
            default:
            case SQLITE3_TEXT: case SQLITE3_BLOB:
               $v[] = '\'' . str_replace('\'', '\\\'', $value) . '\''; break;
            case SQLITE3_INTEGER: case SQLITE3_FLOAT:
               if (!is_numeric($value)) { $keepRow = false; } // sqlite allow to violate datatype
               $v[] = $value; 
               break;
            case SQLITE3_NULL:
               $v[] = 'NULL'; break;
            }
         }
         if ($col) {
            $qhead[] = '"' . $k . '"';
         }
      }
      $q = 'INSERT INTO "' . $name . '" (' . implode(',', $qhead) . ') VALUES (' . implode(',', $v) . ');' . PHP_EOL;
      if ($keepRow) {    
         echo $q;
      } else {
         fprintf(STDERR, 'Drop row => %s', $q);
      }
      $first = FALSE;
   }
}
echo "SET FOREIGN_KEY_CHECKS = 1;";
?>
