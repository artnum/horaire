<?PHP
/* create table if not exists hProject (hProject_id INTEGER PRIMARY KEY AUTOINCREMENT, hProject_name VARCHAR(255), hProject_closed DATETIME NULL, hProject_opened DATETIME NULL); */

class ProjectModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'hProject', 'hProject_id', $config);
      $this->conf('auto-increment', true);
   }
}
?>
