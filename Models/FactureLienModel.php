<?PHP
   class FactureLienModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'factureLien', 'factureLien_id', $config);
         $this->conf('auto-increment', true);
      }
    }
?>
