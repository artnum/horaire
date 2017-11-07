<?PHP

class BaseController extends HTTPController
{
   protected $Model;

   function __construct($model, $config = NULL) {
      $this->Model = $model;
   }

   function getAction($req) {
      if($req->onCollection()) {
         $searches = $this->parseSearch($req->parameters);
         return $this->Model->listing(array(
                  'search' => $this->parseSearch($req->parameters),
                  'sort' => $this->parseSort($req->parameters)
                  ));
      } else {
         return $this->Model->read($req->getItem());
      }
   }
/*
   function parseLimit($http_params) {
      $limits = array();
      if(!empty($http_params['_limit'])) {
         foreach($http_params['_limit'] as $val) {
            if(strlen($val)>0) {
               $limit[] = 
            }
         }
      }
   }
*/
   function parseSort($http_params) {
      $sort = array();
      if(!empty($http_params['_sort'])) {
         foreach($http_params['_sort'] as $val) {
            if(strlen($val) > 0) {
               if($val[0] == '-') {
                  $sort[] = array(substr($val, 1) => 'desc');
               } else {
                  $sort[] = array(substr($val, 1) => 'asc');
               }
            }
         }
      } 

      return $sort;
   }

   /* key=value -> equal
      key=_value -> equal
      key=! -> absent (sql : null)
      key= -> present (sql : not null)
      key=<>value -> different
      key=<value -> smaller or equal
      key=<<value -> smaller
      key=>value -> bigger or equal
      key=>>value -> bigger
      key=~value -> like (ldap phonetic or sql LIKE)
    */
   function parseSearch($http_params) {
      $op = '=';
      $searches = array();
      foreach($http_params as $k => $v) {
         if($k[0] == '_') { continue; } /* avoid _key, use for other purpose */
         $value = '';
         if($v=='') {
            $op = '*';         
         } else {
            if(strlen($v) < 2) {
               if($v == '!') {
                  $op = 'x';
               } else if($v == '*') {
                  $op = '*';
               } else {
                  $op = '=';
                  $value = $v;
               }
            } else {
               switch($v[0]) {
                  default: $op = '='; $value = $v; break; /* equal */
                  case '_': $op = '='; $value = substr($v, 1); break; /* equal */
                  case '~': $op = '~'; $value = substr($v, 1); break;
                  case '<':
                     $op = '<=';
                     $value = substr($v, 1); 
                     if($v[1] == '<') {
                        $op = '<';
                        $value = substr($v, 2);
                     } else if($v[1] == '>') {
                        $op = '!';
                        $value = substr($v, 2);
                     }
                     break;
                  case '>':
                     $op = '>=';
                     $value = substr($v, 1);
                     if($v[1] == '>') {
                        $op = '>';
                        $value = substr($v, 2);
                     } 
                     break;
               }
            }
         }
         
         $searches[] = array($k, $op, $value);
      }
      return $searches;
   }
}

?>
