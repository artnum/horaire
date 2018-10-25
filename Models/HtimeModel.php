<?PHP
   class HtimeModel extends artnum\SQL {
      function __construct($db, $config) {
         parent::__construct($db, 'htime', 'htime_id', $config);
         $this->conf('auto-increment', true);
         $this->conf('datetime', array('day'));
         $this->conf('mtime', 'htime_modified');
         $this->conf('mtime.ts', true);
         $this->conf('create', 'htime_created');
         $this->conf('create.ts', true);
         $this->conf('delete', 'htime_deleted');
         $this->conf('delete.ts', true);
         $this->set_req('get', 'SELECT * FROM "\\Table" LEFT JOIN "project" ON "\\Table"."htime_project" = "project"."project_id" LEFT JOIN "person" ON "\\Table"."htime_person" = "person"."person_id" WHERE "\\IDName" = :id');
      }
   }
?>
