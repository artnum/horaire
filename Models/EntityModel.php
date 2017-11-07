<?PHP

/* An entity is something or someone made to be linked to something */
class EntityModel extends SQLModel
{
   function __construct($db, $config) {
      parent::__construct($db, 'atEntity', 'atEntity_id', $config);
   }

   function read($id) {
      $entry = parent::read($id);
      if(!empty($entry)) {
         foreach(array('workTime', 'vacations', 'disabled') as $k) {
            if(isset($entry[0][$k])) { $entry[0][$k] = intval($entry[0][$k]); } 
            else { $entry[0][$k] = NULL; } 
         }
      }
      return $entry;
   }

   function listing($options) {
      $query = 'SELECT atEntity_id FROM `atEntity`';

      $bindParams = array();
      if(!empty($options)) {
         $q = array();
         if(isset($options['type'])) {
            if(is_string($options['type'])) {
               $bindParams['t0'] = array($options['type'], PDO::PARAM_STR);   
               $q[] = 'atEntity_type = :t0';
            } else if(is_array($options['type'])) {
               $i = 0;
               $_q = array();
               foreach($options['type'] as $t) {
                  $bindParams['t' . $i] = array($options['type'], PDO::PARAM_STR);
                  $_q[] = 'atEntity_type = :t' .$i;         
               }
               $q[] = '(' . implode(' OR ', $_q) . ')';
            }
         }

         if(isset($options['workTime'])) {
            if(preg_match('/^([\+|\-]+|)([0-9]+)$/', $options['workTime'], $m)) {
               $eq = '=';
               switch($m[0]) {
                  default:
                  case '': $eq = '='; break;
                  case '-': $eq = '<='; break;
                  case '--': $eq = '<'; break;
                  case '+': $eq = '>='; break;
                  case '++': $eq = '>'; break;
               }
               $bindParams['worktime'] = array(intval($m[1]), PDO::PARAM_INT);
               $q[] = 'atEntity_workTime ' . $eq . ' :worktime';
            }
         }

         if(count($q) > 0) {
            $query .= ' WHERE ' . implode(' AND ', $q);
         }
      }

      $st = $this->DB->prepare($query . ' ORDER BY atEntity_commonName ASC');
      if($st) {
         if(count($bindParams) > 0) {
            foreach($bindParams as $param => $value) {
               $st->bindParam(':' . $param, $bindParams[$param][0], 
                     $bindParams[$param][1]);
            }
         }
         if($st->execute()) {
            $res = array();
            while($row = $st->fetch()) {
               $res[] = $this->read($row[0])[0];
            }
            return $res;
         }
      }
      return array();
   }
}

?>
