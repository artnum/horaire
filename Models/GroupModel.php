<?PHP
   class GroupModel extends artnum\SQL {
      protected $kconf;
      function __construct($db, $config) {
         $this->kconf = $config;
         parent::__construct($db, 'group', 'group_uid', []);
         $this->conf('auto-increment', true);
         $this->conf('delete', 'group_deleted');
         $this->conf('delete.ts', true);
      }
   }
?>
