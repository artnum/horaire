<?PHP
class ContractModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'contract', 'contract_id', $config);
      $this->conf('auto-increment', true);
   }
}
?>
