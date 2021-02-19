<?PHP
class TSegModel extends artnum\SQL {
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct($db, 'tseg', 'tseg_id', []);
    $this->conf('auto-increment', true);
  }
}
?>
