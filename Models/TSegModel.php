<?PHP
class TSegModel extends artnum\SQL {
  function __construct($db, $config) {
    parent::__construct($db, 'tseg', 'tseg_id', $config);
    $this->conf('auto-increment', true);
  }
}
?>
