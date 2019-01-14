<?PHP
require('artnum/autoload.php');
$r = new artnum\Random();
if (!file_exists(getcwd() .'/db/random-seed.txt')) {
   $r->str(256, getcwd() . '/db/random-seed.txt');
}

$http_request = new artnum\HTTP\JsonRequest();
$store = new artnum\JStore\Generic($http_request, true);

$pdo_db = new PDO("sqlite:db/horaire.sqlite3");
$pdo_db->exec('PRAGMA foreign_keys = YES;');
$store->add_db('sql', $pdo_db);

/* $usersrc = new \artnum\JStore\User($pdo_db, 'person', array('username' => 'person_name', 'key' => 'person_key'));
$store->add_auth('HAuth', $usersrc, file_get_contents(getcwd() . '/db/random-seed.txt')); */

$store->run();
?>
