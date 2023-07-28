<?PHP
class PersonLinkModel extends artnum\SQL {
   private $collection = 'personlink';
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'personlink', 'personlink_uid', []);
   }

   function _delete ($id) {
      global $MSGSrv;

      $ids = $this->parseId($id);
      $db = $this->get_db(false);
      if (!$db) { throw new Exception('No database available'); }
      $stmt = $db->prepare('DELETE FROM "personlink" WHERE "personlink_uid" = :id AND "personlink_service" = :service');
      if (!$stmt) { throw new Exception('No database available'); }
      $stmt->bindParam(':id', $ids[0], PDO::PARAM_INT);
      $stmt->bindParam(':service', $ids[1], PDO::PARAM_STR);
      if (!$stmt->execute()) { throw new Exception($db->errorInfo()[2], $db->errorInfo()); }
      $this->response->start_output();
      $this->response->print(['id' => "$ids[0],$ids[1]"]);
      $MSGSrv->send(json_encode([
         'operation' => 'delete',
         'type' => $this->collection,
         'cid' => $this->kconf->getVar('clientid'),
         'id' => "$ids[0],$ids[1]"
      ]));
      return ['count' => 1];
   }


   function parseId ($id) {
      $ids = explode(',', $id);
      if (count($ids) !== 2) { throw new Exception('Not an ID'); }
      $ids[1] = trim($ids[1]);
      if (empty($ids[1])) { throw new Exception('Not an ID'); }
      if (!ctype_alpha($ids[1]) || !ctype_digit($ids[0])) { throw new Exception('Not an ID'); }
      $ids[0] = intval($ids[0]);
      return $ids;
   }

   function unprefix(&$entry, $table = NULL) {
      $entry = [
         'id' => sprintf('%d,%s', $entry['personlink_uid'], $entry['personlink_service']),
         'uid' => $entry['personlink_uid'],
         'service' => $entry['personlink_service'],
         'extid' => $entry['personlink_extid']
      ];
      return $entry;
   }

   function _read($id, $options = null) {
      $ids = $this->parseId($id);
      $db = $this->get_db(false);
      if (!$db) { throw new Exception('No database available'); }
      $stmt = $db->prepare('SELECT * FROM "personlink" WHERE "personlink_uid" = :id AND "personlink_service" = :service');
      if (!$stmt) { throw new Exception('No database available'); }
      $stmt->bindParam(':id', $ids[0], PDO::PARAM_INT);
      $stmt->bindParam(':service', $ids[1], PDO::PARAM_STR);
      if (!$stmt->execute()) { throw new Exception($db->errorInfo()[2], $db->errorInfo()); }
      if ($stmt->rowCount() !== 1) { throw new Exception('Database error'); }
      if (($data = $stmt->fetch(PDO::FETCH_ASSOC)) === false) { throw new Exception('Database error'); }

      $this->response->start_output();
      $this->response->print($this->unprefix($data));
      return ['count' => 1];
   }

   function _overwrite($data, &$id = NULL) {
      return $this->write($data, $id);
   }

   function _write($data, &$id = NULL) {
      global $MSGSrv;
      $db = $this->get_db(false);

      if ($id === null) {
         $id = sprintf('%d,%s', $data['uid'], $data['service']);
      }
      $ids = $this->parseId($id);
      
      $stmt = $db->prepare(
         'INSERT IGNORE INTO 
         "personlink" ("personlink_uid", "personlink_extid", "personlink_service")
         VALUES (:uid, :extid, :service) ON DUPLICATE KEY UPDATE "personlink_extid" = :extid'
      );
      $stmt->bindParam(':uid', $ids[0], PDO::PARAM_INT);
      $stmt->bindParam(':extid', $data['extid'], PDO::PARAM_STR);
      $stmt->bindParam(':service', $ids[1], PDO::PARAM_STR);
      if (!$stmt->execute()) { throw new Exception($db->errorInfo()[2], $db->errorInfo()); }
      
      $id = sprintf('%d,%s', $ids[0], $ids[1]);
      $readback = $this->_read($id);
      if ($readback['count'] === 1) {
         $MSGSrv->send(json_encode([
            'operation' => 'write',
            'type' => $this->collection,
            'cid' => $this->kconf->getVar('clientid'),
            'id' => $id
         ]));
      }
      return $readback;
   }
}
?>
