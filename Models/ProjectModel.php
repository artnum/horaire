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
   }
}
?>
