<?PHP
/* create table if not exists hProject (hProject_id INTEGER PRIMARY KEY AUTOINCREMENT, hProject_name VARCHAR(255), hProject_closed DATETIME NULL, hProject_opened DATETIME NULL); */

class ProjectModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'project', 'project_id', $config);
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
   function _write($arg) {
      $hook_succeed = false;
      if (!$this->conf('hook-path')) {
         $hook_succeed = true;
      } else {
         if(is_executable($this->conf('hook-path') . '/project-write')) {
            $cmd = $this->conf('hook-path') . '/project-write ';
            foreach ($arg as $k => $v) {
               $k = preg_replace('/[^A-Za-z0-9]+/', '', $k);
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
         $ret = parent::_write($arg);
      }
      return $ret;
   }

}
?>
