<?PHP

class TimeController
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
            foreach(array('from', 'to') as $p) {
               if($req->hasParameter($p)) {
                  try { $options[$p] = new DateTime($req->getParameter($p), new DateTimeZone('UTC')); }
                  catch(Exception $e){ $options[$p] = new DateTime('now', new DateTimeZone('UTC')); }
               }
            }
            foreach(array('target', 'reason') as $p) {
               if($req->hasParameter($p)) {
                  $options[$p] = $req->getParameter($p);
               }
            }
         } 
         return $this->Model->listing($options);      
      } else if($req->onItem()){
         return $this->Model->read($req->getItem());
      }
   }

   /* CREATE */
   function postAction($req) {
      $begin = new DateTime($req->getParameter('begin'), new DateTimeZone('UTC'));
      $end = new DateTime($req->getParameter('end'), new DateTimeZone('UTC'));
      $reason = $req->getParameter('reason');
      $remark = $req->getParameter('remark');
      $target = $req->getParameter('target');
      $type = $req->getParameter('type');

      $data = array('begin' => $begin, 'end' => $end, 'reason' => $reason,
           'remark' => $remark, 'target' => $target, 'type' => $type );
      try {
         $id = $this->Model->write($data);
         return array('succes' => true, 'id' => $id);
      } catch(Exception $e) {
         return array('success' => false, 'msg' => $e->getMessage());
      }
   }

   /* DELETE */
   function deleteAction($req) {
      if($req->onCollection()) {
         return array('success' => false, 'msg' => 'No element selected');
      } else {
         try {
               $this->Model->remove($req->getItem());
               return array('success' => true, 'msg' => 'Element deleted');
         } catch(Exception $e) {
            return array('success' => false, 'msg' => $e->getMessage());
         }
      }
   }

   /* UPDATE */
   function putAction($req) {
      if($req->onCollection()) {
         return array('success' => false, 'msg' => 'Cannot modify collection');
      }
   }   
}

?>
