<?PHP
   class GroupUserModel extends artnum\SQL {
      protected $kconf;
      function __construct($db, $config) {
         $this->kconf = $config;
         parent::__construct($db, 'groupuser', 'groupuser_uid', []);
         $this->conf('auto-increment', true);
      }
   }
?>
