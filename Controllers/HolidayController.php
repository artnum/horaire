<?PHP

class HolidayController extends BaseController
{
   protected $Model;
   protected $Config;

   function __construct($model, $config = NULL) {
      $this->Model = $model;
   }

   /* READ */
   function getAction($req) {
      if($req->onCollection()) {
         $options = array();
         return $this->Model->listing($options);
      } else if($req->onItem()) {
         return $this->Model->read($req->getItem());
      }
   }

   /* CREATE */
   function postAction($req) {
      if($req->hasParameter('holidays')) {
         $holidays = $req->getParameter('holidays');
         $ids = array();
         $err = array();
         foreach($holidays as $day) {
            try {
               $d = new DateTime($day['date'], new DateTimeZone('UTC'));
               $ids[] = $this->Model->write(array('day' => $d, 'name' => $day['name'] ));
            } catch(Exception $e) {
               $err[] = $e->getMessage();
            }
         }
      }

      if(!empty($err)) {
         return array('success' => false, 'msg' => 'Erreur'); 
      } else {
         return array('success' => true, 'id' => $ids[0]);
      }
   }

   /* DELETE */
   function deleteAction($req) {
      if($req->onItem()) {
         $this->Model->remove($req->getItem());
      }
   }

   /* UPDATE */
   function putAction($req) {
      $this->postAction($req);
   }   
}

?>
