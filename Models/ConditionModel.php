<?PHP
class ConditionModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'atCondition', 'atCondition_id', $config);
   }
}
?>
