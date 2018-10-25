<?PHP
   class ItemModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'item', 'item_id', $config);
         $this->conf('auto-increment', true);
         $this->conf('create', 'item_created');
         $this->conf('create.ts', true);
         $this->conf('mtime', 'item_modified');
         $this->conf('mtime.ts', true);
         $this->conf('delete', 'item_deleted');
         $this->conf('delete.ts', true);
      }
   }
?>
