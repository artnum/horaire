<?PHP
class RateModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'taux', 'taux_id', $config);
      $this->conf('auto-increment', true);
   }
}
?>
