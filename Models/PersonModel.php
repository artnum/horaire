<?PHP
   class PersonModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'person', 'person_id', $config);
         $this->conf('auto-increment', true);
         $this->conf('create', 'person_created');
         $this->conf('create.ts', true);
         $this->conf('mtime', 'person_modified');
         $this->conf('mtime.ts', true);
         $this->conf('delete', 'person_deleted');
         $this->conf('delete.ts', true);
      }
   }
?>
