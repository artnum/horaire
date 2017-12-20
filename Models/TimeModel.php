<?PHP

class TimeModel extends SQLModel
{
   function __construct($db, $config) {
      parent::__construct($db, 'atTemp', 'atTemp_id', $config);
   }

   function write($data) {
      $create = FALSE;

      $id = null; $begin = null; $end = null; $type = null; $reason = null;
      $remark = null; $target = null;

      foreach($data as $k => $v) {
         $$k = $v;
      }

      if(is_null($begin) || !($begin instanceof DateTime)) {
         throw new Exception('Invalid parameter : begin not set');
      }
      $begin_str = $begin->format('Y-m-d H:i:s');
      $beginTS = $begin->getTimestamp();

      $end_str = NULL;
      if(!is_null($end) && !($end instanceof DateTime)) {
         throw new Exception('Invalid parameter : end not datetime');
      } else if(!is_null($end)) {
         $end_str = $end->format('Y-m-d H:i:s');
         $endTS = $end->getTimestamp();

         $diff = $begin->diff($end);
         if($diff->invert) {
            throw new Exception('Invalide parameter : end in the past');
         }
      }

      if(is_null($id)) {
         $id = $this->uid();
         $create = TRUE;
      }
      
      $data = array(
            'atTemp_id'       => $id,
            'atTemp_begin'    => $begin_str,
            'atTemp_end'      => $end_str,
            'atTemp_type'     => $type,
            'atTemp_reason'   => $reason,
            'atTemp_target'   => $target,
            'atTemp_remark'   => $remark,
            'atTemp_beginTS'  => $beginTS,
            'atTemp_endTS'    => $endTS,
            'atTemp_diff'     => ($endTS - $beginTS)
            );
   
      if($create) {
        $this->create($data); 
      } else {
         unset($data['atTemp_id']);
         $this->update($id, $data);
      }

      return $id;
   }

   function read($id) {
      $entry = parent::read($id);
      if(!empty($entry)) {
         $entry[0]['begin'] = new DateTime($entry[0]['begin'], new DateTimeZone('UTC'));
         $entry[0]['end'] = new DateTime($entry[0]['end'], new DateTimeZone('UTC'));
      }
      return $entry;
   }

   function listing($options) {
      $query = 'SELECT atTemp_id FROM `atTemp`';

      if(!empty($options)) {
         $q  = array();
         if(isset($options['from'])) {
            $q[] = ' atTemp_begin >= \''. 
               $options['from']->format('Y-m-d H:i:s') . '\'';
         }
         if(isset($options['to'])) {
            $q[] = ' ( atTemp_begin <= \''. 
               $options['to']->format('Y-m-d H:i:s') . '\' ' .
               'OR atTemp_end <= \'' .
               $options['to']->format('Y-m-d H:i:s') . '\') ';
         }
         if(isset($options['target'])) {
            $q[] = ' atTemp_target = \'' . $options['target'] . '\' ';
         }
         if(isset($options['reason'])) {
            $q[] = ' atTemp_reason = \'' . $options['reason'] . '\' ';
         }

         if(!empty($q)) {
            $query .= ' WHERE ';
         }

         $query .= implode(' AND ', $q);
      }

      $st = $this->DB->prepare($query . ' ORDER BY atTemp_begin DESC');
      if($st->execute()) {
         $res = array();
         while($row = $st->fetch()) {
            $res[] = $this->read($row[0])[0];
         } 
         return $res;
      }
   }
}

?>
