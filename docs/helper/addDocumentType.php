<?php

require(__DIR__ . '/../../vendor/autoload.php');

use KaalDB\PDO\PDO;
use KAAL\Utils\Conf;
use Snowflake53\ID;

class Reference
{
    use ID;
}

$conf = new Conf(__DIR__ . '/../../conf/kaal.php');
$pdo = PDO::getInstance(
    $conf->get('storage.pdo-string'),
    $conf->get('storage.user'),
    $conf->get('storage.password')
);

echo 'Adding document_id to accountingDoc' . PHP_EOL;
$stmt3 = $pdo->prepare('
    UPDATE accountingDoc SET document_id = :docid WHERE id = :id;
');
$stmt2 = $pdo->prepare('
    INSERT INTO documents (id,type,year,created,deleted)
    VALUES (:id,:type,:year,:created,:deleted);
');
$stmt = $pdo->prepare('
    SELECT id,type,created,deleted,date
    FROM accountingDoc 
    WHERE document_id IS NULL
    ORDER BY created ASC
');
$stmt->execute();

while (($row = $stmt->fetch())) {
    $row['date'] = new DateTime($row['date']);
    $row['year'] = intval($row['date']->format('Y'));
    $id = Reference::get63(255);
    printf("\tRow %d add document_id %d\n", $row['id'], $id);
    $stmt2->bindValue(':id', $id, PDO::PARAM_INT);
    $stmt2->bindValue(':type', $row['type'], PDO::PARAM_STR);
    $stmt2->bindValue(':year', $row['year'], PDO::PARAM_INT);
    $stmt2->bindValue(':created', $row['created'], PDO::PARAM_INT);
    $stmt2->bindValue(':deleted', $row['deleted'], PDO::PARAM_INT);
    $stmt2->execute();

    $stmt3->bindValue(':id', $row['id'], PDO::PARAM_INT);
    $stmt3->bindValue(':docid', $id, PDO::PARAM_INT);
    $stmt3->execute();
}

echo 'Adding document_id to project' . PHP_EOL;
$stmt3 = $pdo->prepare('
    UPDATE project SET document_id = :docid WHERE project_id = :id;
');
$stmt = $pdo->prepare('
    SELECT project_id,project_created,project_deleted,project_reference
    FROM project 
    WHERE document_id IS NULL
    ORDER BY project_created ASC
');
$stmt->execute();
while (($row = $stmt->fetch())) {

    if (is_null($row['project_created'])) {
        $row['project_created'] = 0;
    }
    if (is_null($row['project_deleted'])) {
        $row['project_deleted'] = 0;
    }
    $row['year'] = intval((new DateTime('@'.$row['project_created']))->format('Y'));
    $row['type'] = 'project';
    $id = Reference::get63(255);
    printf("\tRow %d add document_id %d\n", $row['project_id'], $id);
    $stmt2->bindValue(':id', $id, PDO::PARAM_INT);
    $stmt2->bindValue(':type', $row['type'], PDO::PARAM_STR);
    $stmt2->bindValue(':year', $row['year'], PDO::PARAM_INT);
    $stmt2->bindValue(':created', $row['project_created'], PDO::PARAM_INT);
    $stmt2->bindValue(':deleted', $row['project_deleted'], PDO::PARAM_INT);
    $stmt2->execute();

    $stmt3->bindValue(':id', $row['project_id'], PDO::PARAM_INT);
    $stmt3->bindValue(':docid', $id, PDO::PARAM_INT);
    $stmt3->execute();
}

