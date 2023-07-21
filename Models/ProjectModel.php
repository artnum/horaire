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
      /*
      $bxtoken = $this->kconf->get('bexio.token');
      if ($id === NULL && $ret['count'] === 1 && $bxtoken) {
        try {
          $ctx = new BexioCTX($bxtoken);
          $db = $this->get_db(false);

          $stmt = $db->prepare(sprintf('SELECT * FROM %s WHERE %s = :prjid', $this->Table, $this->IDName));
          $stmt->bindValue(':prjid', $ret['id'], PDO::PARAM_INT);
          $stmt->execute();
          $row = $stmt->fetch();

          $bxcol = new BexioProject($ctx);
          $bxproj = $bxcol->new();
          $bxproj->name =  $row['project_reference'] . ' ' . $row['project_name'];
          $bxproj->user_id = 1;
          $bxproj->pr_state_id = 1;
          $bxproj->pr_project_type_id = 1;
          $bxproj->contact_id = 1;
          
          $result = $bxcol->store($bxproj);
          
          $stmt = $db->prepare(sprintf('UPDATE %s SET project_extid = :bxid WHERE %s = :prjid', $this->Table, $this->IDName));
          $stmt->bindValue(':bxid', $result->id, PDO::PARAM_INT);
          $stmt->bindValue(':prjid', $row['project_id'], PDO::PARAM_INT);
          $stmt->execute();
          
        } catch(Exception $e) {
          error_log('exception');
          error_log($e->getMessage());
        }
      }
      */
    }
    return $ret;
  }


  function getNextReferences ($options) {
    $db = $this->get_db(false);
    $regieReference = "select MAX(CAST(SUBSTR(REGEXP_SUBSTR(project_reference, '^R[0-9]+'),2) AS INT) * 100000 + CAST(SUBSTR(REGEXP_SUBSTR(project_reference, '\-[0-9]+'), 2) AS INT)) AS maxref from project where project_reference REGEXP '^R[0-9]+\-[0-9]+$'";
    $projectReference = "SELECT MAX(CAST(SUBSTR(project_reference, 1, 2) AS INT) * 100000  + CAST(SUBSTR(project_reference, 3) AS INT)) as maxref from project where project_reference REGEXP '^[0-9]{4,}$'";

    $regie = $db->query($regieReference, PDO::FETCH_ASSOC)->fetch();
    $project = $db->query($projectReference, PDO::FETCH_ASSOC)->fetch();

    $currentYear = sprintf("%02d", intval(substr(date('Y'), 2)));

    $regieRef = '';
    if (empty($regie) || empty($regie['maxref'])) {
      $regieRef = "R$currentYear-001";
    } else {
      $y = sprintf("%02d", intval($regie['maxref']) / 100000);
      if ($currentYear !== $y) {
        $regieRef = "R$currentYear-001";
      } else {
        $n = sprintf("%03d", (intval($regie['maxref']) - (intval($y)*100000)) + 1);
        $regieRef = "R$y-$n";
      }
    }

    $projectRef = '';
    if (empty($project) || empty($project['maxref'])) {
      $projectRef = $currentYear . '01';
    } else {
      $y = sprintf("%02d", intval($project['maxref']) / 100000);
      if ($currentYear !== $y) {
        $projectRef = $currentYear . '01';
      } else {
        $n = sprintf("%02d", (intval($project['maxref']) - (intval($y)*100000)) + 1);
        $projectRef = $y . $n;
      }
    }

    $this->response->start_output();
    $this->response->print(['regie' => $regieRef, 'project' => $projectRef]);
    return ['count' => 1];
 }
}
?>
