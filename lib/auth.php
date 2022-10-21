<?php
class KAALAuth {
    protected $pdo;
    protected $table;

    function __construct(PDO $pdo, String $table = 'kaalauth') {
        $this->pdo = $pdo;
        $this->table = $table;
        $this->timeout = 86400; // 24h
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
        $ip = $_SERVER['REMOTE_ADDR'];
        $host = empty($_SERVER['REMOTE_HOST']) ? $ip : $_SERVER['REMOTE_HOST'];
        $ua = !empty($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        
        try {
            $stmt = $pdo->prepare(sprintf('INSERT INTO %s (userid, auth, started, remotehost, remoteip, useragent) VALUES (:uid, :auth, :started, :remotehost, :remoteip, :useragent);', $this->table));
            $stmt->bindValue(':uid', $userid, PDO::PARAM_STR);
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->bindValue(':started', time(), PDO::PARAM_INT);
            $stmt->bindValue(':remotehost', $host, PDO::PARAM_STR);
            $stmt->bindValue(':remoteip', $ip, PDO::PARAM_STR);
            $stmt->bindValue(':useragent', $ua, PDO::PARAM_STR);

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

    function refresh_auth($authvalue) {
        $pdo = $this->pdo;
        $done = false;
        $ip = $_SERVER['REMOTE_ADDR'];
        $host = empty($_SERVER['REMOTE_HOST']) ? $ip : $_SERVER['REMOTE_HOST'];
        try {
            $stmt = $pdo->prepare(sprintf('UPDATE %s SET time = :time, remotehost = :remotehost, remoteip = :remoteip WHERE auth = :auth', $this->table));
            $stmt->bindValue(':time', time(), PDO::PARAM_INT);
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->bindValue(':remotehost', $host, PDO::PARAM_STR);
            $stmt->bindValue(':remoteip', $ip, PDO::PARAM_STR);

            $done = $stmt->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <add-auth>, "%s"', $e->getMessage()));
        } finally {
            return $done;
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

    function get_auth_token () {
        try {
            $authContent = explode(' ', $_SERVER['HTTP_AUTHORIZATION']);
            if (count($authContent) !== 2) { throw new Exception(('Wrong auth header')); }
            return $authContent[1];
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <get-id>, "%s"', $e->getMessage()));
        }
    }

    function get_active_connection ($userid) {
        $pdo = $this->pdo;
        $connections = [];
        try {
            $stmt = $pdo->prepare(sprintf('SELECT * FROM %s WHERE userid = :userid', $this->table));
            $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
            $stmt->execute();
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC))) {
                if (time() - intVal($row['time'], 10) > $this->timeout) {
                    $del = $pdo->prepare(sprintf('DELETE FROM %s WHERE auth = :auth', $this->table));
                    $del->bindValue(':auth', $row['auth'], PDO::PARAM_STR);
                    $del->execute();
                } else {
                   $connections[] = [
                    'uid' => $row['uid'],
                    'useragent' => $row['useragent'],
                    'remoteip' => $row['remoteip'],
                    'remotehost' => $row['remotehost']
                   ];
                }
            }
        } catch(Exception $e) {
            error_log(sprintf('kaal-auth <get-active-connection>, "%s"', $e->getMessage()));
        } finally {
            return $connections;
        }
    }

    function del_specific_connection ($connectionid) {
        $pdo = $this->pdo;

    }

    function del_all_connections ($userid) {
        $pdo = $this->pdo;
        try {
            $stmt = $pdo->prepare(sprintf('DELETE FROM %s WHERE userid = :userid', $this->table));
            $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
            return $stmt->execute();
        } catch(Exception $e) {
            error_log(sprintf('kaal-auth <del-all-connections>, "%s"', $e->getMessage()));
        } 
    }
}