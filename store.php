<?PHP
require('artnum/autoload.php');

$r = new artnum\Random();
if (!file_exists(getcwd() .'/db/random-seed.txt')) {
   $r->str(256, getcwd() . '/db/random-seed.txt');
}

$http_request = new artnum\HTTP\JsonRequest();
$store = new artnum\JStore\Generic($http_request, true);

$pdo_db = new PDO("sqlite:db/horaire.sqlite3");
$store->add_db('sql', $pdo_db);
//$store->add_auth('\artnum\JStore\Auth');

$store->run();
?>
