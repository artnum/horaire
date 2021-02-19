<?PHP

class TimeModel extends artnum/SQL
{
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'atTemp', 'atTemp_id', []);
   }
}

?>
