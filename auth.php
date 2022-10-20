<?php

require('lib/auth.php');
require('lib/ini.php');
require('lib/dbs.php');

try {
    header('Content-Type: application/json', true);

    $ini_conf = load_ini_configuration();
    $pdo = init_pdo($ini_conf);
    if (is_null($pdo)) {
        throw new Exception('Database unavailable');
    }

    if (empty($_SERVER['PATH_INFO'])) {
        throw new Exception();
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Bad method');
    }

    $KAuth = new KAALAuth($pdo);
    $content = json_decode(file_get_contents('php://input'), true);

    $step = substr($_SERVER['PATH_INFO'], 1);
    switch ($step) {
        default: throw new Exception('Unknown step');
        case 'init':
            if(empty($content['userid'])) { throw new Exception(); }
            $stmt =$pdo->prepare('SELECT "person_id", "person_key", "person_keyopt" FROM "person" WHERE "person_id" = :id');
            $stmt->bindValue(':id', intval($content['userid']), PDO::PARAM_INT);
            $stmt->execute();
            if ($stmt->rowCount() !== 1) { throw new Exception(); }
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            $auth = $KAuth->generate_auth($data['person_id'], $data['person_key']);
            if (empty($auth)) { throw new Exception(); }
            $params = explode(' ', $data['person_keyopt']);
            if (count($params) !== 2) { throw new Exception(); }
            echo json_encode([
                'auth' => $auth,
                'count' => intval($params[0]),
                'salt' => $params[1],
                'userid' => intval($data['person_id'])
            ]);
            break;
        case 'check':
            if (empty($content['auth'])) { throw new Exception(); }
            if (!$KAuth->confirm_auth($content['auth'])) { throw new Exception(); }
            $KAuth->refresh_auth($content['auth']);
            echo json_encode(['done' => true]);
            break;
        case 'quit':
            if (empty($content['auth'])) { throw new Exception(); }
            if (!$KAuth->del_auth($content['auth'])) { throw new Exception(); }
            echo json_encode(['done' => true]);
            break;
        case 'userid':
            if (empty($content['username'])) { throw new Exception(); }
            $stmt =$pdo->prepare('SELECT "person_id" FROM "person" WHERE LOWER("person_username") = :username');
            $stmt->bindValue(':username', strtolower($content['username']), PDO::PARAM_STR);
            $stmt->execute();
            if ($stmt->rowCount() !== 1) { throw new Exception(); }
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            if (empty($data['person_id'])) { throw new Exception(); }
            echo json_encode(['userid' => intval($data['person_id'])]);
            break;
    }
} catch (Exception $e) {
    $msg = $e->getMessage();
    error_log(var_export($e, true));
    if (empty($msg)) { $msg = 'Wrong parameter'; }
    echo json_encode(['error' => $msg]);
    exit(0);

}