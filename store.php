<?PHP
require('artnum/autoload.php');


$http_request = new artnum\HTTP\JsonRequest();
$store = new artnum\JStore\Generic($http_request, true);

$pdo_db = new PDO("sqlite:/srv/apache-data/airtime.sqlite");
$store->add_db('sql', $pdo_db);

$store->run();
?>
