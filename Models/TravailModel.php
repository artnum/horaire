<?PHP
class TravailModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'travail', 'travail_id', $config);
      $this->conf('auto-increment', true);
      $this->conf('create', 'travail_created');
      $this->conf('create.ts', true);
      $this->conf('mtime', 'travail_modified');
      $this->conf('mtime.ts', true);
   }
}
?>
