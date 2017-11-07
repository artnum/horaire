<?PHP

class ConditionView extends JSONView {
   function getAction($res) {
      foreach($res as $k => $r) {
         if(! is_null($r['begin'])) { $res[$k]['begin'] = $r['begin']->format('Y-m-d\TH:i:s\Z'); }
         if(! is_null($r['end'])) { $res[$k]['end'] = $r['end']->format('Y-m-d\TH:i:s\Z'); }
      }
      parent::getAction($res);
   }
}

?>
