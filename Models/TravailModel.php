<?PHP
class TravailModel extends artnum\SQL {
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'travail', 'travail_id', []);
      $this->conf('auto-increment', true);
      $this->conf('create', 'travail_created');
      $this->conf('create.ts', true);
      $this->conf('mtime', 'travail_modified');
      $this->conf('mtime.ts', true);
   }

  function getUnplanned($options) {
    if (!empty($options['search'])) {
      $whereClause = $this->prepareSearch($options['search']); 
    }
    if (strstr($whereClause, 'WHERE') === FALSE) {
      $whereClause = 'WHERE';
    } else {
      $whereClause .= ' AND';
    }
    $query = sprintf('%s %s %s', $this->req('get'), $whereClause,
                     '("travail_time" / "travail_force") > COALESCE((' .
                     'SELECT SUM("tseg_time" / "tseg_efficiency") ' .
                     'FROM "tseg" WHERE "tseg_travail" = "travail"."travail_id"' .
                     '), -1)'
    );
    if (!empty($options['sort'])) {
      $query .= ' ' . $this->prepareSort($options['sort']);
    }
    if (!empty($options['limit'])) {
      $query .= ' ' . $this->prepareSort($options['limit']);
    }
    
    try {
      $st = $this->get_db(true)->prepare($query);
      if($st->execute()) {
        $data = $st->fetchAll(\PDO::FETCH_ASSOC);
        $return = array();
        $ids = array();
        foreach($data as $d) {
          if (!in_array($d[$this->IDName], $ids)) {
            $id = $d[$this->IDName];
            $return[] = $this->_postprocess($this->unprefix($d));
            $ids[] = $id;
          }
        }
        return array($return, count($return));
      }
    } catch(\Exception $e) {
      $this->error('Database error : ' . $e->getMessage(), __LINE__, __FILE__);
      return array(NULL, 0);
    }

    return array(NULL, 0);    
  }
}
?>
