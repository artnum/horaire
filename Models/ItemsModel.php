<?PHP
   class ItemsModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'items', 'items_id', $config);
         $this->conf('auto-increment', true);
         $this->conf('datetime', array('created', 'deleted', 'modification'));
         $this->conf('mtime', 'items_modification');
         $this->conf('mtime.ts', true);
         $this->conf('delete', 'items_deleted');
         $this->conf('delete.ts', true);
      }
   }
?>
