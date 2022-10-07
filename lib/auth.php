<?php
class KAALAuth {
    protected $pdo;
    protected $table;

    function __construct(PDO $pdo, String $table = 'kaalauth') {
        $this->pdo = $pdo;
        $this->table = $table;
        $this->timeout = 28800; // 8h
    }

    function generate_auth ($userid, $hpw) {
        $sign = bin2hex(random_bytes(32));
        $authvalue=  bin2hex(hash_hmac('sha256', $sign, $hpw, true));
        if ($this->add_auth($userid, $authvalue)) {
            return $sign;
        }
        return '';
    }

    function confirm_auth ($authvalue) {
        $pdo = $this->pdo;
        $done = false;
        try {
            $stmt = $pdo->prepare(sprintf('UPDATE %s SET "time" = :time, "confirmed" = 1 WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->bindValue(':time', time(), PDO::PARAM_INT);

            $done = $stmt->execute();
        } catch(Exception $e) {
            error_log(sprintf('kaal-auth <confirm-auth>, "%s"', $e->getMessage()));
        } finally {
            if ($done) {
                return $this->check_auth($authvalue);
            }
            return $done;
        }
    }

    function add_auth ($userid, $authvalue) {
        $pdo = $this->pdo;
        $done = false;
        try {
            $stmt = $pdo->prepare(sprintf('INSERT INTO %s (userid, auth, started) VALUES (:uid, :auth, :started);', $this->table));
            $stmt->bindValue(':uid', $userid, PDO::PARAM_STR);
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->bindValue(':started', time(), PDO::PARAM_INT);

            $done = $stmt->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <add-auth>, "%s"', $e->getMessage()));
        } finally {
            return $done;
        }
    }

    function del_auth ($authvalue) {
        $pdo = $this->pdo;
        try {
            $stmt = $pdo->prepare(sprintf('DELETE FROM %s WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->execute();
        } catch(Exception $e) {
            error_log(sprintf('kaal-auth <del-auth>, "%s"', $e->getMessage()));
        } finally {
            return true;
        }
    }

    function check_auth ($authvalue) {
        $pdo = $this->pdo;
        $matching = false;
        try {
            $stmt = $pdo->prepare(sprintf('SELECT * FROM %s WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->execute();
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC))) {
                if (time() - intVal($row['time'], 10) > $this->timeout) {
                    $del = $pdo->prepare(sprintf('DELETE FROM %s WHERE auth = :auth', $this->table));
                    $del->bindValue(':auth', $row['auth'], PDO::PARAM_STR);
                    $del->execute();
                } else {
                    $matching = true;
                    break;
                }
            }
        } catch(Exception $e) {
            error_log(sprintf('kaal-auth <check-auth>, "%s"', $e->getMessage()));
        } finally {
            return $matching;
        }
    }

    function get_id ($authvalue) {
        $pdo = $this->pdo;
        $matching = false;
        try {
            $stmt = $pdo->prepare(sprintf('SELECT * FROM %s WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->execute();
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC))) {
                if (time() - intVal($row['time'], 10) > $this->timeout) {
                    $del = $pdo->prepare(sprintf('DELETE FROM %s WHERE auth = :auth', $this->table));
                    $del->bindValue(':auth', $row['auth'], PDO::PARAM_STR);
                    $del->execute();
                } else {
                    $matching = $row['userid'];
                    break;
                }
            }
        } catch(Exception $e) {
            error_log(sprintf('kaal-auth <get-id>, "%s"', $e->getMessage()));
        } finally {
            return $matching;
        }
    }

}