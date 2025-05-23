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
      $this->conf('force-type', ['travail_phone' => 'string']);
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

  function _write($data, &$id = NULL) {
    global $MSGSrv;
    $data['phone'] = strval($data['phone']);
    $result = parent::_write($data, $id);
    if ($result['count'] > 0) {
      $MSGSrv->send(json_encode([
        'operation' => 'write',
        'type' => 'travail',
        'cid' => $this->kconf->getVar('clientid'),
        'id' => $result['id']
      ]));
    }
    return $result;
  }

  function _delete($id) {
    global $MSGSrv;
    $result = parent::_delete($id);
    if ($result['count'] > 0) {
      $MSGSrv->send(json_encode([
        'operation' => 'delete',
        'type' => 'travail',
        'cid' => $this->kconf->getVar('clientid'),
        'id' => $id
      ]));
    }
    return $result;
  }

  function get_owner($data, $id = null) {
    if ($id === null) { return -1; }
    try {
      $db = $this->get_db(true);
      $stmt = $db->prepare('SELECT project_manager FROM project WHERE project_id = (SELECT travail_project FROM travail WHERE travail_id = :id)');
      $stmt->bindValue(':id', $id, PDO::PARAM_INT);
      $stmt->execute();
      $row = $stmt->fetch(PDO::FETCH_NUM);
      if (!$row) { throw new Exception('null'); }
      return $row[0];
    } catch(Exception $e) {
      return -1;
    }
  }

}
?>
