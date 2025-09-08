<?php

namespace KAAL;

use KAAL\Utils\Base64;
use PDO;
use Exception;
use KAAL\Crypto;

class Auth
{
    protected $pdo;
    protected $table;
    protected $timeout;
    protected int $current_userid;
    protected int $current_tenantid;
    protected int $tenant_id;

    public const INVITATION_BYTES_LENGTH = 16; // 128 bits

    public const SHARE_NONE = 0x00;
    public const SHARE_TEMPORARY = 0x01;
    public const SHARE_LIMITED_ONCE = 0x02; /* share until used once but with time limit */
    public const SHARE_INVITATION = 0x03;
    public const SHARE_NOT_TIMED = 0x80; /* not used, below time apply, above time don't apply */
    public const SHARE_PERMANENT = 0x81;
    public const SHARE_PROXY = 0x82; /* to create token for proxy, never expires, not bound to any url, not bound to any user */
    public const SHARE_UNLIMITED_ONCE = 0x83; /* share until used once */
    public const SHARE_USER_PROXY = 0x84; /* to create token for proxy, never expires, not bound to any url, bound to specific user */

    private const SQL_QUERIES = [
        'add_auth_without_tenant' => 'INSERT INTO %s 
            (
                userid, auth, started, duration, remotehost, remoteip,
                useragent, share, urlid, url, comment
            ) 
            VALUES (
                :uid, :auth, :started, :duration, :remotehost,
                :remoteip, :useragent, :share, :urlid, :url, :comment
            );',
        'add_auth_with_tenant' => 'INSERT INTO %s 
            (
                userid, auth, started, duration, remotehost, remoteip,
                useragent, share, urlid, url, comment, tenant_id
            ) 
            VALUES (
                :uid, :auth, :started, :duration, :remotehost,
                :remoteip, :useragent, :share, :urlid, :url, :comment,
                :tenant_id
            );',
        'list_invitations' => 'SELECT auth FROM %s
            WHERE userid = :uid AND tenant_id = :tenant_id
                AND share = :share;',
        'deleteAnInvitation' => 'DELETE FROM %s
            WHERE userid = :uid AND tenant_id = :tenant_id
                AND auth = :auth'
    ];

    public function __construct(PDO $pdo, String $table = 'kaalauth')
    {
        $this->pdo = $pdo;
        $this->table = $table;
        $this->timeout = 86400; // 24h
        $this->current_userid = -1;
        $this->tenant_id = 0;
    }

    public function get_current_userid(): int
    {
        return $this->current_userid;
    }

    /**
     * Get tenant_id of authenticated user
     *
     * @return Tenant id
     */
    public function get_tenant_id(): int
    {
        if ($this->tenant_id > 0) {
            return $this->tenant_id;
        }

        $stmt = $this->pdo->prepare(
            'SELECT tenant_id FROM person WHERE person_id = :person_id'
        );
        $stmt->bindValue(':person_id', $this->get_current_userid(), PDO::PARAM_INT);
        if (!$stmt->execute()) {
            throw new Exception('Error getting tenant id');
        }
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new Exception('Error getting tenant id');
        }
        $this->tenant_id = (int) $row['tenant_id'];
        if ($this->tenant_id <= 0) {
            throw new Exception('Error getting tenant id');
        }
        return $this->tenant_id;

    }

    /**
     * Generate an authentication code
     *
     * @param $userid    The user to invite
     * @param $tenant_id The tenant id or false for legacy code
     *
     * @return An authentication code (basically a set of random bytes)
     */
    public function generate_invitation(
        int|string $userid,
        int|false $tenant_id = false
    ): string {
        $authvalue =  Crypto::get_random_tag(self::INVITATION_BYTES_LENGTH);

        if ($this->add_auth(
            $userid,
            $authvalue,
            '',
            self::SHARE_INVITATION,
            0,
            $this->timeout,
            $tenant_id
        )
        ) {
            return $authvalue;
        }
        return '';
    }

    public function list_invitations(
        int|string $userid,
        int|false $tenant_id = false
    ): array {
        try {
            $stmt = $this->pdo->prepare(
                sprintf(
                    self::SQL_QUERIES['list_invitations'],
                    $this->table
                )
            );
            $stmt->bindValue(':uid', (int)$userid, PDO::PARAM_INT);
            $stmt->bindValue(
                ':tenant_id',
                $tenant_id === false ? $this->get_tenant_id() : $tenant_id,
                PDO::PARAM_INT
            );
            $stmt->bindValue(':share', self::SHARE_INVITATION, PDO::PARAM_INT);
            $stmt->execute();
            $results = [];
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC)) !== false) {
                $results[] = $row;
            }
            return $results;
        } catch (Exception $e) {
            error_log(
                sprintf('kaal-auth <list-invitation>, "%s"', $e->getMessage())
            );
            return [];
        }
    }

    public function auth_by_invitation($invitation)
    {
        $pdo = $this->pdo;
        try {
            $stmt = $pdo->prepare(sprintf('SELECT * FROM %s WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $invitation, PDO::PARAM_STR);
            $stmt->execute();
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC))) {
                if (intval($row['share']) != self::SHARE_INVITATION) {
                    /* overtime, delete and next auth token ... if any */
                    $this->del_specific_connection($row['uid']);
                    continue;
                }
                if ((time() - intval($row['started']) > intval($row['duration']))) {
                    $this->del_specific_connection($row['uid']);
                    continue;
                }
                return $row['userid'];
            }
            return false;
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <auth-by-invitation>, "%s"', $e->getMessage()));
        }
    }

    public function get_invitation_info($invitation)
    {
        $pdo = $this->pdo;
        try {
            $stmt = $pdo->prepare(sprintf('SELECT * FROM %s WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $invitation, PDO::PARAM_STR);
            $stmt->execute();
            $userid = null;
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC))) {
                if (intval($row['share']) != self::SHARE_INVITATION) {
                    /* overtime, delete and next auth token ... if any */
                    $this->del_specific_connection($row['uid']);
                    continue;
                }
                if ((time() - intval($row['started']) > intval($row['duration']))) {
                    $this->del_specific_connection($row['uid']);
                    continue;
                }
                $userid = $row['userid'];
                break;
            }
            if ($userid == null) {
                return false;
            }
            $stmt = $this->pdo->prepare('SELECT "person_id", "person_name", "person_username" FROM "person" WHERE "person_id" = :id');
            $stmt->bindValue(':id', intval($userid), PDO::PARAM_INT);
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || empty($row)) {
                return false;
            }
            return [$row['person_name'], $row['person_username']];
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <get-invitation-info>, "%s"', $e->getMessage()));
        }
    }

    /**
     * Delete a specific invitation.
     *
     * @param $userid     The user id
     * @param $tenantid   The tenand id
     * @param $invitation The invitation code
     *
     * @return True if succeed or false if failed
     */
    public function deleteAnInvitation(
        int $userid,
        int $tenantid,
        string $invitation
    ): bool {
        $stmt = $this->pdo->prepare(
            sprintf(self::SQL_QUERIES['deleteAnInvitation'], $this->table)
        );
        $stmt->bindValue(':uid', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenantid, PDO::PARAM_INT);
        $stmt->bindValue(':auth', $invitation, PDO::PARAM_STR);
        return $stmt->execute();
    }

    public function delete_invitation(
        $userid,
        int $tenant_id = 1
    ): bool {
        $pdo = $this->pdo;
        $stmt = $pdo->prepare(
            sprintf(
                'DELETE FROM %s
                WHERE userid = :userid
                    AND share = :share
                    AND tenant_id = :tenant_id',
                $this->table
            )
        );
        $stmt->bindValue(':share', self::SHARE_INVITATION, PDO::PARAM_INT);
        $stmt->bindValue(':userid', intval($userid), PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    public function generate_auth($userid, $hpw, $cnonce = '', $hash = 'SHA-256')
    {
        $crypto = new Crypto($hash);
        $sign = $crypto->get_random_bytes();
        $authvalue = $crypto->stringify($crypto->hmac($sign . $cnonce, Base64::decode($hpw)));
        if ($this->add_auth($userid, $authvalue, '', self::SHARE_NONE)) {
            return $crypto->stringify($sign);
        }
        return '';
    }

    public function generate_share_auth($userid, $authvalue, $url, $permanent = self::SHARE_PERMANENT, $comment = '', $duration = -1, $hash = 'SHA-256')
    {
        $share_authvalue = $this->get_share_auth($userid, $url, $permanent);
        if (!empty($share_authvalue)) {
            $this->refresh_auth($share_authvalue);
            return $share_authvalue;
        }
        $crypto = new Crypto($hash);
        $sign = $crypto->get_random_bytes();
        $share_authvalue = $crypto->stringify($crypto->hmac($sign, Base64::decode($authvalue)));
        if ($this->add_auth($userid, $share_authvalue, $this->prepare_url($url), $permanent, $comment, $duration)) {
            return $share_authvalue;
        }
        return '';
    }

    public function get_share_auth($userid, $url, $permanent = self::SHARE_PERMANENT)
    {
        $url = $this->prepare_url($url);
        $urlid = sha1($url);
        $stmt = $this->pdo->prepare(sprintf('SELECT * FROM %s WHERE userid = :userid AND urlid = :urlid AND share = :share', $this->table));
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':urlid', $urlid, PDO::PARAM_STR);
        $stmt->bindValue(':share', $permanent, PDO::PARAM_INT);
        $stmt->execute();
        while (($row = $stmt->fetch(PDO::FETCH_ASSOC))) {
            return $row['auth'];
        }
        return '';
    }

    public function prepare_url_query($query)
    {
        $parts = explode('&', $query);
        $parts = array_filter($parts, function ($element) {
            /* access_token parameter is used to pass auth token, so it is not known when getting the shareable token */
            if (strpos($element, 'access_token=') === 0) {
                return false;
            }
            return true;
        });
        if (empty($parts)) {
            return '';
        }
        /* sort to allow query begin like ?length=10&time=20 or ?time=20&length=10 */
        sort($parts, SORT_STRING);
        return '?' . implode('&', $parts);
    }

    public function prepare_url($url)
    /* we want tld and first level only. so sublevel can change without
     * invalidating url. protocols is not set as it must be https.
     */
    {
        $url = filter_var($url, FILTER_VALIDATE_URL);
        $parsed = parse_url($url);
        $host = [];
        $hostParts = explode('.', $parsed['host']);
        array_unshift($host, array_pop($hostParts));
        array_unshift($host, array_pop($hostParts));
        /* needed to allow hosts like localhost or any strange setup */
        $host = array_filter($host, function ($e) { return (empty($e) ? false : true); });
        $url = implode('.', $host);
        if (isset($parsed['path']) && $parsed['path'] !== null) {
            $url .= str_replace('//', '/', $parsed['path']);
        }
        if (isset($parsed['query']) && $parsed['query'] !== null) {
            $url .= $this->prepare_url_query($parsed['query']);
        }

        return str_replace('//', '/', $url);
    }

    public function confirm_auth($authvalue)
    {
        $pdo = $this->pdo;
        $done = false;
        try {
            $stmt = $pdo->prepare(sprintf('UPDATE %s SET "time" = :time, "confirmed" = 1 WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->bindValue(':time', time(), PDO::PARAM_INT);

            $done = $stmt->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <confirm-auth>, "%s"', $e->getMessage()));
        } finally {
            if ($done) {
                return $this->check_auth_nodelete($authvalue);
            }
            return $done;
        }
    }

    public function add_auth(
        int|string $userid,
        string $authvalue,
        string $url = '',
        int $sharetype = self::SHARE_NONE,
        string $comment = '',
        int $duration = -1,
        int|false $tenant_id = false
    ): bool {
        $pdo = $this->pdo;
        $done = false;
        $ip = $_SERVER['REMOTE_ADDR'];
        $host = empty($_SERVER['REMOTE_HOST']) ? $ip : $_SERVER['REMOTE_HOST'];
        $ua = !empty($_SERVER['HTTP_USER_AGENT']) ? hash('sha256', $_SERVER['HTTP_USER_AGENT']) : '';
        if ($duration === -1) {
            $duration = $this->timeout;
        }
        try {
            $urlid = '';
            switch ($sharetype) {
                default:
                    $urlid = sha1($url);
                    break;
                case self::SHARE_NONE:
                case self::SHARE_INVITATION:
                    $url = '';
                    break;
            }

            $stmt = $pdo->prepare(
                sprintf(
                    $tenant_id === false
                    ? self::SQL_QUERIES['add_auth_without_tenant']
                    : self::SQL_QUERIES['add_auth_with_tenant'],
                    $this->table
                )
            );
            $stmt->bindValue(':uid', $userid, PDO::PARAM_STR);
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->bindValue(':started', time(), PDO::PARAM_INT);
            $stmt->bindValue(':duration', $duration, PDO::PARAM_INT);
            $stmt->bindValue(':remotehost', $host, PDO::PARAM_STR);
            $stmt->bindValue(':remoteip', $ip, PDO::PARAM_STR);
            $stmt->bindValue(':useragent', $ua, PDO::PARAM_STR);
            $stmt->bindValue(':share', $sharetype, PDO::PARAM_INT);
            $stmt->bindValue(':urlid', $urlid, PDO::PARAM_STR);
            $stmt->bindValue(':url', $url, PDO::PARAM_STR);
            $stmt->bindValue(':comment', substr($comment, 0, 140), PDO::PARAM_STR);
            if ($tenant_id !== false) {
                $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
            }
            $done = $stmt->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <add-auth>, "%s"', $e->getMessage()));
        } finally {
            return $done;
        }
    }

    public function del_auth($authvalue)
    {
        $pdo = $this->pdo;
        try {
            $stmt = $pdo->prepare(sprintf('DELETE FROM %s WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <del-auth>, "%s"', $e->getMessage()));
        } finally {
            return true;
        }
    }

    private function check_auth_nodelete($authvalue)
    {
        try {
            $stmt = $this->pdo->prepare(sprintf('SELECT * FROM %s WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->execute();
            if ($stmt->rowCount() < 1) {
                throw new Exception('No known auth');
            }
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->current_userid = intval($row['userid']);
            return true;
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <check_auth_nodelete>, "%s"', $e->getMessage()));

        }
    }

    public function check_auth($authvalue, $url = '')
    {
        $pdo = $this->pdo;
        try {
            $urlid = '';
            if (!empty($url)) {
                $urlid = sha1($this->prepare_url($url));
            }
            $stmt = $pdo->prepare(sprintf('SELECT * FROM %s WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->execute();
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC))) {
                if ((intval($row['share']) < self::SHARE_NOT_TIMED)
                    && (time() - intval($row['time']) > intval($row['duration']))
                ) {
                    /* overtime, delete and next auth token ... if any */
                    $this->del_all_connection_by_id($row['uid']);
                    continue;
                }

                switch (intval($row['share'])) {
                    default:
                    case self::SHARE_NOT_TIMED:
                        break;
                    case self::SHARE_NONE:
                        $this->current_userid = intval($row['userid']);
                        return true;
                    case self::SHARE_PERMANENT:
                    case self::SHARE_TEMPORARY:
                        if ($row['urlid'] !== $urlid) {
                            break;
                        }
                        $this->current_userid = intval($row['userid']);
                        return true;
                        break;
                    case self::SHARE_PROXY: // proxy have complete access
                        $this->current_userid = 0;
                        return true;
                    case self::SHARE_USER_PROXY:
                        $this->current_userid = intval($row['userid']);
                        break;
                    case self::SHARE_UNLIMITED_ONCE:
                    case self::SHARE_LIMITED_ONCE:
                        $this->current_userid = intval($row['userid']);
                        $this->del_all_connection_by_id($row['uid']);
                        return true;
                }
            }
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <check-auth>, "%s"', $e->getMessage()));
        }
    }

    public function refresh_auth($authvalue)
    {
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
            error_log(sprintf('kaal-auth <refresh-auth>, "%s"', $e->getMessage()));
        } finally {
            return $done;
        }
    }

    public function get_id($authvalue)
    {
        $pdo = $this->pdo;
        $matching = false;
        try {
            $stmt = $pdo->prepare(sprintf('SELECT * FROM %s WHERE auth = :auth', $this->table));
            $stmt->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $stmt->execute();
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC))) {
                if (
                    (
                        intval($row['share']) !== self::SHARE_PERMANENT
                        && intval($row['share']) !== self::SHARE_PROXY
                    )
                    && (time() - intval($row['time']) > intval($row['duration']))
                ) {
                    $this->del_specific_auth($row['auth']);
                } else {
                    $matching = $row['userid'];
                    break;
                }
            }
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <get-id>, "%s"', $e->getMessage()));
        } finally {
            return $matching;
        }
    }

    public function get_auth_token()
    {
        try {
            /* auth can be passed as url */
            if (!empty($_GET['access_token'])) {
                return $_GET['access_token'];
            }
            $authContent = explode(' ', $_SERVER['HTTP_AUTHORIZATION']);
            if (count($authContent) !== 2) {
                throw new Exception(('Wrong auth header'));
            }
            return $authContent[1];
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <get-auth-token>, "%s"', $e->getMessage()));
        }
    }

    public function get_active_connection($userid)
    {
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
                    $auth = '';
                    if (
                        intval($row['share']) === self::SHARE_PERMANENT
                        || intval($row['share']) === self::SHARE_TEMPORARY
                    ) {
                        $auth = $row['auth'];
                    }
                    $connections[] = [
                     'uid' => $row['uid'],
                     'time' => $row['time'],
                     'duration' => $row['duration'],
                     'useragent' => $row['useragent'],
                     'remoteip' => $row['remoteip'],
                     'remotehost' => $row['remotehost'],
                     'share' => $row['share'],
                     'url' => $row['url'],
                     'auth' => $auth,
                     'comment' => $row['comment']
                    ];
                }
            }
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <get-active-connection>, "%s"', $e->getMessage()));
        } finally {
            return $connections;
        }
    }

    public function del_specific_auth($authvalue)
    {
        try {
            $del = $this->pdo->prepare(sprintf('DELETE FROM %s WHERE auth = :auth', $this->table));
            $del->bindValue(':auth', $authvalue, PDO::PARAM_STR);
            $del->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <del-specific-auth>, "%s"', $e->getMessage()));
        }
    }

    public function del_specific_connection($connectionid)
    {
        $pdo = $this->pdo;
        try {
            $stmt = $pdo->prepare(sprintf('DELETE FROM %s WHERE uid = :uid', $this->table));
            $stmt->bindValue(':uid', $connectionid, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <del-specific-connection>, "%s"', $e->getMessage()));
        }
    }

    public function del_all_shares($userid)
    {
        $pdo = $this->pdo;
        try {
            $stmt = $pdo->prepare(sprintf('DELETE FROM %s WHERE userid = :userid AND (share = 2 OR share = 1)', $this->table));
            $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <del-all-shares>, "%s"', $e->getMessage()));
        }
    }

    public function del_all_connections_shares($userid)
    {
        $pdo = $this->pdo;
        try {
            $stmt = $pdo->prepare(sprintf('DELETE FROM %s WHERE userid = :userid', $this->table));
            $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <del-all-connections-shares>, "%s"', $e->getMessage()));
        }
    }

    public function del_all_connections($userid)
    {
        $pdo = $this->pdo;
        try {
            $stmt = $pdo->prepare(sprintf('DELETE FROM %s WHERE userid = :userid AND share = 0', $this->table));
            $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <del-all-connections>, "%s"', $e->getMessage()));
        }
    }

    public function get_auth_by_id($uid)
    {
        try {
            $stmt = $this->pdo->prepare(sprintf('SELECT * FROM %s WHERE uid = :uid AND userid = :userid', $this->table));
            $stmt->bindValue(':uid', $uid, PDO::PARAM_INT);
            $stmt->bindValue(':userid', $this->current_userid, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <get-auth-by-id>, "%s"', $e->getMessage()));
        }
    }

    public function del_all_connection_by_id($uid)
    {
        try {
            $stmt = $this->pdo->prepare(sprintf('DELETE FROM %s WHERE uid = :uid AND userid = :userid', $this->table));
            $stmt->bindValue(':uid', $uid, PDO::PARAM_INT);
            $stmt->bindValue(':userid', $this->current_userid, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (Exception $e) {
            error_log(sprintf('kaal-auth <del-all-connection-by-id>, "%s"', $e->getMessage()));
        }
    }

    public function run($step, \artnum\JStore\AuthUser $user)
    {
        try {
            header('Content-Type: application/json', true);
            if (empty($_SERVER['PATH_INFO'])) {
                throw new Exception();
            }
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Bad method');
            }
            $content = json_decode(file_get_contents('php://input'), true);
            switch ($step) {
                default: throw new Exception('Unknown step');
                case 'init':
                    $cnonce = null;
                    $hash = 'SHA-256';
                    if (!empty($content['hash']) && Crypto::algo_available($content['hash'])) {
                        $hash = $content['hash'];
                    }
                    if (!empty($content['cnonce'])) {
                        $cnonce = Base64::decode($content['cnonce']);
                    }
                    if (empty($content['userid'])) {
                        throw new Exception();
                    }
                    $data = $user->get($content['userid']);
                    if (!$data) {
                        throw new Exception();
                    }
                    $auth = $this->generate_auth($data['id'], $data['key'], $cnonce, $data['algo']);
                    if (empty($auth)) {
                        throw new Exception();
                    }
                    $response = [
                        'auth' => $auth,
                        'count' => $data['key_iterations'],
                        'salt' => $data['key_salt'],
                        'userid' => intval($data['id']),
                        'algo' => $data['algo']
                    ];
                    echo json_encode($response);
                    break;
                case 'getshareable':
                    if (empty($content['url'])) {
                        throw new Exception();
                    }
                    // no break
                case 'check':
                    if (empty($content['auth'])) {
                        throw new Exception();
                    }
                    if (!$this->confirm_auth($content['auth'])) {
                        throw new Exception();
                    }
                    $this->refresh_auth($content['auth']);
                    $this->delete_invitation($this->current_userid);
                    if ($step === 'getshareable') {
                        $hash = 'SHA-256';
                        if (!empty($content['hash']) && Crypto::algo_available($content['hash'])) {
                            $hash = $content['hash'];
                        }
                        $once = ((isset($content['once'])) ? ($content['once'] == true) : false);
                        $permanent = (isset($content['permanent']) ? ($content['permanent'] == true) : false);
                        $comment = (isset($content['comment']) ? htmlspecialchars(strval($content['comment'])) : '');
                        $duration = (isset($content['duration']) ? intval($content['duration']) : 86400);
                        $userid = $this->get_current_userid();
                        $token = $this->generate_share_auth(
                            $userid,
                            $content['auth'],
                            $content['url'],
                            $once ? ($permanent ? self::SHARE_UNLIMITED_ONCE : self::SHARE_LIMITED_ONCE)
                                  : ($permanent ? self::SHARE_PERMANENT : self::SHARE_TEMPORARY),
                            $comment,
                            $duration,
                            $hash
                        );
                        $this->confirm_auth($token);
                        if (empty($token)) {
                            throw new Exception();
                        }
                        echo json_encode(['done' => true, 'token' => $token, 'duration' => $duration]);
                        break;
                    }
                    echo json_encode(['done' => true, 'uid' => $this->current_userid, 'token' => $content['auth']]);
                    break;
                case 'quit':
                    if (empty($content['auth'])) {
                        throw new Exception();
                    }
                    if (!$this->del_auth($content['auth'])) {
                        throw new Exception();
                    }
                    echo json_encode(['done' => true]);
                    break;
                case 'userid':
                    if (empty($content['username'])) {
                        throw new Exception();
                    }
                    $data = $user->getByUsername($content['username']);
                    echo json_encode(['userid' => $data['id']]);
                    break;
                case 'active':
                    $token = $this->get_auth_token();
                    if (!$this->check_auth($token)) {
                        throw new Exception();
                    }
                    $userid = $this->get_id($token);
                    if (empty($content['userid'])) {
                        throw new Exception();
                    }
                    $stmt = $this->pdo->prepare('SELECT "person_id", "person_level", "tenant_id" FROM "person" WHERE "person_id" = :id');
                    $stmt->bindValue(':id', intval($userid), PDO::PARAM_INT);
                    $stmt->execute();
                    if ($stmt->rowCount() !== 1) {
                        throw new Exception();
                    }
                    $data = $stmt->fetch(PDO::FETCH_ASSOC);
                    if (intval($data['person_level']) > 16) {
                        if (intval($data['person_id']) !== intval($content['userid'])) {
                            throw new Exception();
                        }
                    }
                    $connections = $this->get_active_connection($content['userid']);
                    echo json_encode(['userid' => intval($content['userid']), 'connections' => $connections]);
                    break;
                case 'disconnect-all':
                case 'disconnect-share':
                case 'disconnect':
                    $token = $this->get_auth_token();
                    if (!$this->check_auth($token)) {
                        throw new Exception();
                    }
                    $userid = $this->get_id($token);
                    if (empty($content['userid'])) {
                        throw new Exception();
                    }
                    $stmt = $this->pdo->prepare('SELECT "person_id", "person_level", "tenant_id" FROM "person" WHERE "person_id" = :id');
                    $stmt->bindValue(':id', intval($userid), PDO::PARAM_INT);
                    $stmt->execute();
                    if ($stmt->rowCount() !== 1) {
                        throw new Exception();
                    }
                    $data = $stmt->fetch(PDO::FETCH_ASSOC);
                    if (intval($data['person_level']) > 16) {
                        if (intval($data['person_id']) !== intval($content['userid'])) {
                            throw new Exception();
                        }
                    }
                    switch ($step) {
                        case 'disconnect':
                            if (!$this->del_all_connections($content['userid'])) {
                                throw new Exception();
                            }
                            break;
                        case 'disconnect-all':
                            if (!$this->del_all_connections_shares($content['userid'])) {
                                throw new Exception();
                            }
                            break;
                        case 'disconnect-share':
                            if (!$this->del_all_shares($content['userid'])) {
                                throw new Exception();
                            }
                            break;
                    }
                    echo json_encode(['userid' => intval($content['userid'])]);
                    break;
                case 'invitation':
                    $token = $this->get_auth_token();
                    if (!$this->check_auth($token)) {
                        throw new Exception();
                    }
                    $userid = $this->get_id($token);
                    if (empty($content['userid'])) {
                        throw new Exception();
                    }
                    $stmt = $this->pdo->prepare('SELECT "person_id", "person_level", "tenant_id" FROM "person" WHERE "person_id" = :id');
                    $stmt->bindValue(':id', intval($userid), PDO::PARAM_INT);
                    $stmt->execute();
                    if ($stmt->rowCount() !== 1) {
                        throw new Exception();
                    }
                    $data = $stmt->fetch(PDO::FETCH_ASSOC);
                    if (intval($data['person_level']) > 16) {
                        throw new Exception();
                    }
                    $invitation = $this->generate_invitation($content['userid']);
                    if (empty($invitation)) {
                        throw new Exception();
                    }
                    echo json_encode(['invitation' => $invitation]);
                    break;
                case 'disconnect-by-id':
                    $token = $this->get_auth_token();
                    if (!$this->check_auth($token)) {
                        throw new Exception();
                    }
                    if (empty($content['uid'])) {
                        throw new Exception();
                    }
                    $conn = $this->get_auth_by_id($content['uid']);
                    if (!$conn) {
                        throw new Exception();
                    }
                    $success = $this->del_all_connection_by_id($conn['uid']);
                    echo json_encode(['done' => $success]);
                    break;
                case 'get-invitation-info':
                    if (empty($content['invitation'])) {
                        throw new Exception();
                    }
                    $person = $this->get_invitation_info($content['invitation']);
                    if (!$person) {
                        throw new Exception();
                    }
                    echo json_encode(['name' => $person[0], 'username' => $person[1]]);
                    break;
                case 'connect-by-invitation':
                    if (empty($content['invitation'])) {
                        throw new Exception();
                    }
                    $userid = $this->auth_by_invitation($content['invitation']);
                    if (empty($userid)) {
                        throw new Exception();
                    }
                    $content['userid'] = $userid;
                    $invitation_login = true;
                    /* set invitation_login and fall through, as everything is
                       sent to set new password
                    */
                    // no break
                case 'setpassword':
                    if (!$invitation_login) {
                        $token = $this->get_auth_token();
                        if (!$this->check_auth($token)) {
                            throw new Exception();
                        }
                    }
                    if (empty($content['userid'])) {
                        throw new Exception();
                    }
                    if (empty($content['key'])) {
                        throw new Exception();
                    }
                    if (empty($content['salt'])) {
                        throw new Exception();
                    }
                    if (empty($content['iterations'])) {
                        throw new Exception();
                    }
                    if (empty($content['algo'])) {
                        throw new Exception();
                    }
                    $stmt = $this->pdo->prepare('SELECT "person_id", "person_level", "tenant_id" FROM "person" WHERE "person_id" = :id');
                    $stmt->bindValue(':id', intval($content['userid']), PDO::PARAM_INT);
                    $stmt->execute();
                    if ($stmt->rowCount() !== 1) {
                        throw new Exception();
                    }
                    $data = $stmt->fetch(PDO::FETCH_ASSOC);
                    if (intval($data['person_level']) > 16) {
                        if (intval($data['person_id']) !== intval($content['userid'])) {
                            throw new Exception();
                        }
                    }
                    $user->setPassword(
                        $content['userid'],
                        $content['key'],
                        ['key_algo' => $content['algo'],
                        'key_iterations' => $content['iterations'],
                        'key_salt' => $content['salt']
                        ]
                    );
                    /* delete all invitation for user if we log in through
                     * invitation and password is set
                     */
                    if ($invitation_login) {
                        $this->delete_invitation($content['userid']);
                    }
                    echo json_encode(['userid' => intval($content['userid'])]);
                    break;
            }
        } catch (Exception $e) {
            $msg = $e->getMessage();
            error_log(var_export($e, true));
            if (empty($msg)) {
                $msg = 'Wrong parameter';
            }
            echo json_encode(['error' => $msg]);
            exit(0);
        }
    }
}
