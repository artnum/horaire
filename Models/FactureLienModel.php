<?PHP
   class FactureLienModel extends artnum\SQL {
      function __construct($db, $config) {
         $this->kconf = $config;
         parent::__construct($db, 'factureLien', 'factureLien_id', []);
         $this->conf('auto-increment', true);
      }
    }
?>
