<?PHP
   class PrixHeureModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'prixheure', 'prixheure_id', $config);
         $this->conf('auto-increment', true);
      }
    }
?>
