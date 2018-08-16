<?PHP
   class HtimeModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'htime', 'htime_id', $config);
         $this->conf('auto-increment', true);
         $this->conf('datetime', array('day', 'created', 'deleted', 'modification'));
         $this->conf('mtime', 'htime_modification');
         $this->conf('mtime.ts', true);
         $this->conf('delete', 'htime_deleted');
         $this->conf('delete.ts', true);
         $this->set_req('get', 'SELECT * FROM "\\Table" LEFT JOIN "projects" ON "\\Table"."htime_projects" = "projects"."projects_id" WHERE "\\IDName" = :id');
      }
   }
?>
