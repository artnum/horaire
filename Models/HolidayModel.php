<?PHP

class HolidayModel extends artnum\SQL
{
   function __construct($db, $config) {
      parent::__construct($db, 'atHoliday', 'atHoliday_id', $config);
   }

   function write($data) {
      $data['day'] = $data['day']->format('Y-m-d');

      return parent::write($data);
   }

   function listing() {
      return parent::listing(array('sort' => array(array('day', 'ASC'))));
   }
}
