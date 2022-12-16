<?php
class KUser implements artnum\JStore\AuthUser {
    function __construct($pdo) {
        $this->pdo = $pdo;
    }
    public function get($id) {
        $stmt =$this->pdo->prepare('SELECT "person_id", "person_key", "person_keyopt" FROM "person" WHERE "person_id" = :id AND "person_disabled" = 0 AND "person_deleted" IS NULL');
        $stmt->bindValue(':id', intval($id), PDO::PARAM_INT);
        $stmt->execute();
        if ($stmt->rowCount() !== 1) { throw new Exception(); }
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        $keyopts = explode(' ', $data['person_keyopt']);
        if (count($keyopts) < 2) { throw new Exception(); }
        return [
            'key_salt' => $keyopts[1],
            'key_iterations' => intval($keyopts[0]),
            'key' => $data['person_key'],
            'id' => $data['person_id']
        ];
    }
    public function getByUsername($username) {
        $stmt =$this->pdo->prepare('SELECT "person_id" FROM "person" WHERE LOWER("person_username") = :username');
        $stmt->bindValue(':username', strtolower($username), PDO::PARAM_STR);
        $stmt->execute();
        if ($stmt->rowCount() !== 1) { throw new Exception(); }
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        if (empty($data['person_id'])) { throw new Exception(); }
        return ['id' => intval($data['person_id'])];
    }
    public function setPassword($id, $key, $keyopts) {
        $keystr = strval($keyopts['key_iterations']) . ' ' . $keyopts['key_salt'];
        $stmt = $this->pdo->prepare('UPDATE "person" SET "person_key" = :key, "person_keyopt" = :keyopt WHERE "person_id" = :id');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':keyopt', $keystr, PDO::PARAM_STR);
        $stmt->bindValue(':key', $key, PDO::PARAM_STR);
        return $stmt->execute();
    }
}