<?PHP

class JSONView {
   protected $Model;

   function __construct($model, $config = NULL) {
      $this->Model = $model;
   }

   function getAction($res) {
      echo json_encode($res);
   }

   function writeAction($res) {
      if(isset($res['id'])) {
         echo '{"success": true, "id" : "' . $res['id'] . '"}';
      } else {
         echo '{"success": false}';
      }
   }

   function postAction($res) {
      $this->writeAction($res);
   }

   function putAction($res) {
      $this->writeAction($res);     
   }

   function deleteAction($res) {
      echo json_encode($res); 
   }
}

?>
