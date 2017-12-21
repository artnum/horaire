<?PHP
class ProjectModel extends artnum\SQL {
   function __construct($db, $config) {
      parent::__construct($db, 'atProject', 'atProject_id', $config);
   }
}
?>
