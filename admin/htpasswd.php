<?PHP
require('../lib/PHP-Htpasswd/Htpasswd.php');
$htpasswd = new Htpasswd('.htpasswd');
if (isset($_GET['json'])) {
   $data = json_decode($_GET['json'], true);
   if ($data['user'] && $data['op']) {
      switch(strtolower($data['op'])) {
      case 'edit':
         if ($data['password']) {
            if ($htpasswd->userExists($data['user'])) {
               $htpasswd->updateUser($data['user'], $data['password'], Htpasswd::ENCTYPE_SHA1);
            } else {
               $htpasswd->addUser($data['user'], $data['password'], Htpasswd::ENCTYPE_SHA1);
            }
         }
         break;
      case 'delete':
         if ($htpasswd->userExists($data['user'])) {
            $htpasswd->deleteUser($data['user']);
         }
         break;
      }
   }
   echo '{}';
} else {
   $users = array();
   foreach ($htpasswd->getUsers() as $k => $v) {
      $users[] = $k;
   }
   echo json_encode($users);
}
?>
