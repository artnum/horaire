<?PHP

class EntityController extends BaseController
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
         if($req->hasParameters()) {
            if($req->hasParameter('type')) {
               $options['type'] = $req->getParameter('type');
            }
            if($req->hasParameter('workTime')) {
               $options['workTime'] = intval($req->getParameters('workTime'));
            }
         }  
         return $this->Model->listing($options);
      } else if($req->onItem()) {
         return $this->Model->read($req->getItem());
      }
   }

   /* CREATE */
   function postAction($req) {
      foreach(array('commonName', 'type', 'workTime') as $p) {
         if(! $req->hasParameter($p) || !$req->getParameter($p)) {
            return array('success' => false, 'msg' => 'Missing ' . $p);
         }
      }
      return parent::postAction($req);
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
