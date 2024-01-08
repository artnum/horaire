<?PHP
/* create table if not exists hProject (hProject_id INTEGER PRIMARY KEY AUTOINCREMENT, hProject_name VARCHAR(255), hProject_closed DATETIME NULL, hProject_opened DATETIME NULL); */

require('lib/bexio.php');

class ProjectModel extends artnum\SQL {
  protected $kconf;
  protected $bxcache;

  use BexioJSONCache;

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

    if ($this->kconf->get('bexio.enabled') != 0) {
      $cacheopts = $config->getVar('bxcache');
      $this->bxcache = new BexioCache($cacheopts[0], $cacheopts[1], $cacheopts[2]);
    }
  }
  
  function getBxProjectStatus ($bxDb, $name = 'Offen') {
    $bxPrjStatus = new BizCuit\BexioProjectStatus($bxDb);
    $results = $bxPrjStatus->list();

    foreach($results as $result) {
      if ($result->name === $name) { return $result->id; }
    }
    return 1;
  }

  function getBxProjectType ($bxDb, $name = 'Kundenprojekt') {
    $bxPrjType = new BizCuit\BexioProjectType($bxDb);
    $results = $bxPrjType->list();

    foreach($results as $result) {
      if ($result->name === $name) { return $result->id; }
    }
    return 1;
  }

  function unlinkBxProject ($project) {
    $db = $this->get_db();
    $stmt = $db->prepare("UPDATE project SET project_extid = NULL WHERE project_id = :id");
    $stmt->bindValue(':id', $project, PDO::PARAM_INT);
    return $stmt->execute();
  }

  function createEditBxProject ($project, $bxId = null) {
    $bexioDB = $this->kconf->getVar('bexioDB');
    $bexioProject = new BizCuit\BexioProject($bexioDB);

    if ($bxId === null) {
      $bxProject = $bexioProject->new();
    } else {
      $bxProject = $bexioProject->get($bxId);
    }

    $db = $this->get_db(true);
    $stmt = $db->prepare("SELECT personlink_extid FROM personlink WHERE personlink_service = 'bexio' AND personlink_uid = :manager");
    $stmt->bindValue(':manager', $project['manager'], PDO::PARAM_INT);
    if (!$stmt->execute()) { $bxProject->user_id = 1; }
    if ($stmt->rowCount() < 1) { $bxProject->user_id = 1; }
    $dbData = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$dbData) { $bxProject->user_id = 1; }
    else { $bxProject->user_id = $dbData['personlink_extid']; }

    $bxProject->name = $project['reference'] . ' ' . $project['name'];

    $bxProject->pr_project_type_id = $this->getBxProjectType($bexioDB);
    $bxProject->pr_state_id = $this->getBxProjectStatus($bexioDB);
    
    $contact = explode('/', $project['client']);
    $contact = array_pop($contact);
    if (!str_starts_with($contact, '@bx_')) { return null; }
    $bxProject->contact_id = substr($contact, 4);

    $object = $bexioProject->set($bxProject);
    $this->store_cache($object->getType() . '/' . $object->getId(), $object->toJson(), 1);
    return $object;
  }

  function _write($arg, &$id = NULL) {
    if ($this->kconf->get('bexio.enabled') != 0) {
      try {
        if ($this->kconf->getVar('bexioDB')) {
          if (!is_null($id) && !empty($arg['extid']) && $arg['extid'] === '_unlink') {
            $this->unlinkBxProject($id);
            unset($arg['extid']);
          } else {
            if ($id === null || (!empty($arg['extid']) && $arg['extid'] === '_create')) {
              $bxProject = $this->createEditBxProject($arg);
              $arg['extid'] = $bxProject->id;
            } else {
              $extid = null;
              $db = $this->get_db(true);
              $stmt = $db->prepare("SELECT project_extid FROM project WHERE project_id = :id");
              $stmt->bindValue(':id', $id, PDO::PARAM_INT);
              if ($stmt->execute()) {
                if ($stmt->rowCount() > 0) {
                  $dbData = $stmt->fetch(PDO::FETCH_ASSOC);
                  $extid = $dbData['project_extid'];
                }
              }
              if (!$extid && $arg['extid']) { $extid = $arg['extid']; }
              if ($extid && !empty($arg['manager']) && !empty($arg['reference']) && !empty($arg['name'])) {
                $bxProject = $this->createEditBxProject($arg, $extid);
                $extid = $bxProject->id;
              }
              $arg['extid'] = $extid;
            }
          }
        }
      } catch (Exception $e) {
        error_log('Bexio error : ' . $e->getMessage());
        $this->response->softError('bexio', $e);
      }
    }

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
      $projectRef = $currentYear . '001';
    } else {
      $y = sprintf("%02d", intval($project['maxref']) / 100000);
      if ($currentYear !== $y) {
        $projectRef = $currentYear . '001';
      } else {
        $n = sprintf("%03d", (intval($project['maxref']) - (intval($y)*100000)) + 1);
        $projectRef = $y . $n;
      }
    }

    $this->response->start_output();
    $this->response->print(['regie' => $regieRef, 'project' => $projectRef]);
    return ['count' => 1];
 }
}
?>
