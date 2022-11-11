<?PHP
/* create table if not exists hProject (hProject_id INTEGER PRIMARY KEY AUTOINCREMENT, hProject_name VARCHAR(255), hProject_closed DATETIME NULL, hProject_opened DATETIME NULL); */

class ProjectModel extends artnum\SQL {
  function __construct($db, $config) {
    $this->kconf = $config;
    parent::__construct($db, 'project', 'project_id', []);
    $this->conf('owner', 'project_manager');
    $this->conf('auto-increment', true);
    $this->conf('datetime', array('project_closed', 'project_opened', 'project_targetEnd'));
    $this->conf('create', 'project_created');
    $this->conf('create.ts', true);
    $this->conf('mtime', 'project_modified');
    $this->conf('mtime.ts', true);
    $this->conf('delete', 'project_deleted');
    $this->conf('delete.ts', true);
    $this->conf('hook-path', 'exec/hooks');
    $this->conf('ignored', array('year'));
  }
  function _write($arg, &$id = NULL) {    
    $hook_succeed = false;
    if (!$this->conf('hook-path') || $id !== NULL) {
      $hook_succeed = true;
    } else {
      if(is_executable($this->conf('hook-path') . '/project-write')) {
        setlocale(LC_CTYPE, 'C.UTF-8'); // generic UTF-8 so escapeshell allow utf-8 chars
        $cmd = $this->conf('hook-path') . '/project-write ';
        foreach ($arg as $k => $v) {
          $k = preg_replace('/[^A-Za-z0-9]+/', '', $k);
          $v = preg_replace('/\/+/', '', $v);
          $cmd .= ' -' . $k . ' ' . escapeshellarg($v);
        }
        exec($cmd, $out, $ret);
        if ($ret == 0) {
          $hook_succeed = true;
        }
      }
    }

    $ret = null;
    if ($hook_succeed) {
      $ret = parent::_write($arg, $id);
    }
    return $ret;
  }

}
?>
