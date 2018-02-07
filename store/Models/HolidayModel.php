<?PHP
class HolidayModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'holiday', 'holiday_id', $config);
      $this->conf('auto-increment', true);
   }
}
?>
