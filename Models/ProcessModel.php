<?PHP
class ProcessModel extends artnum\SQL {
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'process', 'process_id', []);
      $this->conf('auto-increment', true);
      $this->conf('create', 'process_created');
      $this->conf('create.ts', true);
      $this->conf('mtime', 'process_modified');
      $this->conf('mtime.ts', true);
      $this->conf('delete', 'process_deleted');
      $this->conf('delete.ts', true);
   }
}
?>
