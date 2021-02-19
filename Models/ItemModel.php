<?PHP
   class ItemModel extends artnum\SQL {
      function __construct($db, $config) {
         $this->kconf = $config;
         parent::__construct($db, 'item', 'item_id', []);
         $this->conf('auto-increment', true);
         $this->conf('create', 'item_created');
         $this->conf('create.ts', true);
         $this->conf('mtime', 'item_modified');
         $this->conf('mtime.ts', true);
         $this->conf('delete', 'item_deleted');
         $this->conf('delete.ts', true);
         $this->set_req('get', 'SELECT * FROM "\\Table" LEFT JOIN "category" ON "\\Table"."item_category" = "category"."category_id"');
      }
   }
?>
