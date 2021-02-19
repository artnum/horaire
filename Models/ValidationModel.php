<?PHP
class ValidationModel extends artnum\SQL
{
   function __construct($db, $config) {
      $this->kconf = $config;
      parent::__construct($db, 'atValidation', 'atValidation_id', []);
   }
}

?>
