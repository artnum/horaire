<?PHP
   class PaiementModel extends artnum\SQL {
      function __construct($db, $config) {
         $this->kconf = $config;
         parent::__construct($db, 'paiement', 'paiement_id', []);
         $this->conf('auto-increment', true);
      }
    }
?>
