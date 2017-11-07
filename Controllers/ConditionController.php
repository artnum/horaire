<?PHP
class ConditionController extends BaseController
{
   function getAction($req) {
      if($req->onItem() && $req->getItem() == '__default') {
         return $this->Model->get_default();
      }
      return parent::getAction($req);
   }

   function postAction($req) {

      if($req->getItem() == '__default') {
         if($req->hasParameter('id')) {
            return $this->Model->set_default($req->getParameter('id'));
         }
         return array('success' => false, 'msg' => 'No ID given to set default');  
      } 

      if(! $req->hasParameter('name') || !$req->getParameter('name')) {
         return array('success' => false, 'msg' => 'Missing name');
      }
      foreach(array('begin', 'end') as $k) {
         if($req->hasParameter($k)) {
            $req->setParameter($k, new DateTime($req->getParameter($k), new DateTimeZone('UTC')));
         }
      }
     
      return parent::postAction($req);
   }
}
?>
