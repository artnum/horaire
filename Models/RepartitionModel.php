<?PHP
   class RepartitionModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'repartition', 'repartition_id', $config);
         $this->conf('auto-increment', true);
         $this->conf('force-type', ['value' => 'str', 'tva' => 'str']);
      }
    }
?>
