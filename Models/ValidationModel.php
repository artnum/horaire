<?PHP
/* CREATE TABLE atValidation ( 
      atValidation_id VARCHAR(15) UNIQUE NOT NULL, 
      atValidation_target VARCHAR(15) NOT NULL, 
      atValidation_month INTEGER, 
      atValidation_year INTEGER, 
      atValidation_vacations INTEGER, 
      atValidation_worktime INTEGER, 
      atValidation_todo INTEGER ); */


class ValidationModel extends \artnum\SQL
{
   function __construct($db, $config) {
      parent::__construct($db, 'atValidation', 'atValidation_id', $config);
   }

   function remove($id) {
      return $this->delete($id);
   }

   function write($data) {
      if(is_null($data['target'])) {
         return NULL;
      }
      return parent::write($data);
   }
}

?>
