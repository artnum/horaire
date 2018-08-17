<?PHP
   class QuantityModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'quantity', 'quantity_id', $config);
         $this->conf('auto-increment', true);
      }
   }
?>
