<?PHP
   class PrixHeureModel extends artnum\SQL {
      function __construct($db, $config) {
         $this->kconf = $config;
         parent::__construct($db, 'prixheure', 'prixheure_id', []);
         $this->conf('auto-increment', true);
      }
    }
?>
