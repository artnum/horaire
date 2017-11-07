<?PHP
class ConditionModel extends SQLModel {
   function __construct($db, $config) {
      parent::__construct($db, 'atCondition', 'atCondition_id', $config);
   }

   function set_default($id) {
      if($this->DB->beginTransaction()) {
         if($this->DB->exec('UPDATE atCondition SET atCondition_default = 0')===FALSE) {
            $this->DB->rollBack();
            throw new Exception('Database error');
         }
         try {
            $stmt = $this->DB->prepare('UPDATE atCondition SET atCondition_default = 1 WHERE atCondition_id = :i0');
            $stmt->bindParam(':i0', $id, PDO::PARAM_STR);
            if($stmt->execute()) {
               if($stmt->rowCount() == 1) {
                  $this->DB->commit();
                  return array('default' => $id);
               }
            throw new Exception('Row count not 1');
            }
            throw new Exception('Execute failed');
         } catch(Exception $e) {
            $this->DB->rollBack();
            throw new Exception('Database error : ' . $e->getMessage());
         }
         $this->DB->commit();
      }

      throw new Exception('Transaction failed to start');
      return array();
   }

   function write($data) {

      foreach(array('begin', 'end') as $k) {
         if(!is_null($data[$k])) {
            if(!($data[$k] instanceof DateTime)) {
               throw new Exception('Invalid parameter : ' . $k . ' not datetime');
            }
            $data[$k] = $data[$k]->format('Y-m-d H:i:s');
         }
      }

      foreach(array('weekHours', 'vacations', 'nightCost', 'sundayCost',
              'holidaysCost' , 'endNight', 'beginNight') as $k) {
         if(!is_null($data[$k])) {
            if(!ctype_digit(''.$data[$k].'')) {
         echo $k . ' '. $data[$k] .' ' . ctype_digit($data[$k]);
               throw new Exception('Invalid parameter : ' . $k . ' not digit');
            }
            $data[$k] = intval($data[$k]);
         }
      }

      return parent::write($data);
   }

   function get_default() {
      $res = $this->DB->query('SELECT atCondition_id FROM atCondition WHERE atCondition_default = 1');
      if($res) {
         $data = $res->fetch();
         if($data) {
            return $this->read($data[0]);
         }
      }

      return array();
   }

   function read($id) {
      $entry = parent::read($id);
      if(!empty($entry)) {
         foreach(array('begin', 'end') as $k) {
            if(!is_null($entry[0][$k])) {
               $entry[0][$k] = new DateTime($entry[0][$k]);
            }
         }
         foreach(array('vacations', 'weekHours', 'holidaysCost', 'beginNight', 'endNight', 'nightCost', 'sundayCost' ) as $k) {
            if(!is_null($entry[0][$k])) {
               $entry[0][$k] = intval($entry[0][$k]);
            }
         }
      }

      return $entry;
   }

   function listing($options) {
      $bindParams = array();
      $query = 'SELECT atCondition_id FROM `atCondition`';
      
      if(!empty($options)) {
         $q = array();
         if(isset($options['entity'])) {
            if(is_string($options['entity'])) {
               if($options['entity'] == 'NULL') {
                  $bindParams['e0'] = array(NULL, PDO::PARAM_NULL);
               } else {
                  $bindParams['e0'] = array($options['entity'], PDO::PARAM_STR);
               }
               $q[] = 'atCondition_entity = :e0';
            }
         }

         if(count($q) > 0) {
            $query .= ' WHERE ' . implode(' AND ', $q);
         }
      }

      $st = $this->DB->prepare($query . ' ORDER BY atCondition_begin');
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
