<?PHP
   class RepartitionModel extends artnum\SQL {
      function __construct($db, $config) {
         $this->kconf = $config;
         parent::__construct($db, 'repartition', 'repartition_id', []);
         $this->conf('auto-increment', true);
         $this->conf('force-type', ['value' => 'str', 'tva' => 'str']);
      }
    }
?>
