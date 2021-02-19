<?PHP
   class CategoryModel extends artnum\SQL {
      function __construct($db, $config) {
         $this->kconf = $config;
         parent::__construct($db, 'category', 'category_id', []);
         $this->conf('auto-increment', true);
         $this->conf('create', 'category_created');
         $this->conf('create.ts', true);
         $this->conf('mtime', 'category_modified');
         $this->conf('mtime.ts', true);
         $this->conf('delete', 'category_deleted');
         $this->conf('delete.ts', true);
      }
   }
?>
