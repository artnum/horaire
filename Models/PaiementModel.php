<?PHP
   class PaiementModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'paiement', 'paiement_id', $config);
         $this->conf('auto-increment', true);
      }
    }
?>
