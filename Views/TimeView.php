<?PHP

class TimeView extends JSONView 
{
   function getAction($res) {
      foreach($res as $k => $r) {
         $res[$k]['begin'] = $r['begin']->format('Y-m-d\TH:i:s\Z');
         $res[$k]['end'] = $r['end']->format('Y-m-d\TH:i:s\Z');
      }
      parent::getAction($res);
   }
}

?>
