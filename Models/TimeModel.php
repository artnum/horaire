<?PHP

class TimeModel extends artnum/SQL
{
   function __construct($db, $config) {
      parent::__construct($db, 'atTemp', 'atTemp_id', $config);
   }
}

?>
