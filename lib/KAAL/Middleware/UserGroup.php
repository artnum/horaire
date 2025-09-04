<?php

namespace KAAL\Middleware;

use Exception;
use KAAL\Context;
use KAAL\Utils\FinalException;
use KAAL\Utils\MixedID;
use KAAL\Utils\Normalizer;
use KAAL\Utils\PrefixedTable;
use PDO;
use Snowflake53\ID;
use stdClass;
use Generator;
use KAAL\Utils\SQLStdErr;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL, ERR_DUPLICATE};

/**
 * UserGroup class
 */
class UserGroup
{
    use ID;
    use PrefixedTable;
    use Normalizer;
    use MixedID;

    public function __construct(protected Context $context)
    {
    }

    protected static function normalizeEgressUserGroup(stdClass $ugroup): stdClass
    {
        if (empty($ugroup)) {
            throw new Exception('Empty group', ERR_BAD_REQUEST);
        }

        if (isset($ugroup->tenant_id)) {
            /* field starting with _ are private and filtered out
             * on output
             */
            $ugroup->_tenant_id = self::normalizeId($ugroup->tenant_id);
            unset($ugroup->tenand_id);
        }

        $ugroup->id = strval(self::normalizeId($ugroup->uid));
        unset($ugroup->uid);
        $ugroup->name = self::normalizeString($ugroup->name);
        $ugroup->description = self::normalizeString($ugroup->description);

        return $ugroup;
    }

    protected static function normalizeIngressUserGroup(stdClass $ugroup): stdClass
    {
        if (empty($ugroup)) {
            throw new Exception('No group provided', ERR_BAD_REQUEST);
        }

        if (!empty($ugroup->id)) {
            $ugroup->uid = self::normalizeId($ugroup->id);
            unset($ugroup->id);
        }
        if (!empty($ugroup->tenant_id)) {
            unset($ugroup->tenant_id);
        }
        if (!empty($ugroup->_tenant_id)) {
            unset($ugroup->_tenant_id);
        }
        $ugroup->name = self::normalizeString($ugroup->name);
        $ugroup->description = self::normalizeString($ugroup->description);
        return $ugroup;
    }
    /**
     * List all groups
     */
    public function list(): Generator
    {
        try {
            $this->context->rbac()->can(
                $this->context->auth(),
                get_class($this),
                __FUNCTION__
            );

            $stmt = $this->context->pdo()->prepare(
                'SELECT group_uid, group_name, group_description FROM `group`
                WHERE COALESCE(group_deleted, 0) = 0
                AND tenant_id = :tenant'
            );
            $stmt->bindValue(
                ":tenant",
                $this->context->auth()->get_tenant_id(),
                PDO::PARAM_INT
            );
            $stmt->execute();
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC)) != null) {
                yield $this->normalizeEgressUserGroup(
                    (object) $this->unprefix($row)
                );
            }
        } catch (Exception $e) {
            throw new Exception('Group listing failed', ERR_INTERNAL, $e);
        }
    }


    /**
     * Get groups for a user
     *
     * @return Generator<stdClass>
     */
    public function forUser(string|int $userid): Generator
    {
        try {
            $this->context->rbac()->can(
                $this->context->auth(),
                get_class($this),
                __FUNCTION__
            );
            $pdo = $this->context->pdo();

            $stmt = $pdo->prepare(
                'SELECT group_uid,group_name,group_description FROM `groupuser`
                LEFT JOIN `group` ON groupuser_group = group_uid
                WHERE groupuser_user = :userid
                    AND COALESCE(group_deleted, 0) = 0
                    AND `group`.tenant_id = :tenant
                    AND `groupuser`.tenant_id = :tenant'
            );
            $stmt->bindValue(":userid", self::normalizeId($userid), PDO::PARAM_INT);
            $stmt->bindValue(
                ":tenant",
                $this->context->auth()->get_tenant_id(),
                PDO::PARAM_INT
            );
            $stmt->execute();
            while (($row = $stmt->fetch(PDO::FETCH_ASSOC)) != null) {
                yield $this->normalizeEgressUserGroup(
                    (object) $this->unprefix($row)
                );
            }
        } catch (Exception $e) {
            throw new Exception('Group not found', ERR_INTERNAL, $e);
        }
    }

    public function deleteUserGroups(int|string|stdClass $userid)
    {
        $userid = self::normalizeId($userid);
        $tenant_id = $this->context->auth()->get_tenant_id();

        $stmt = $this->context->pdo()->prepare(
            'DELETE FROM `groupuser`
            WHERE `groupuser_user` = :user AND `tenant_id` = :tenant'
        );
        $stmt->bindValue(':user', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':tenant', $tenant_id, PDO::PARAM_INT);
        $stmt->execute();

        return (object)['success' => true];
    }

    /**
     * Set all groups for a user
     *
     * @param int|string $userid The user
     * @param array      $groups List of group id
     *
     * @return stdClass With a success field set to true if succeed
     */
    public function setUserGroups(int|string|stdClass $userid, array $groups): stdClass
    {
        $userid = self::normalizeId($userid);
        $tenand_id = $this->context->auth()->get_tenant_id();
        $groups = array_unique(
            array_map(fn ($v) => self::normalizeInt($v), $groups)
        );

        $this->context->pdo()->exec('START TRANSACTION');
        try {
            /* check if groups exists for current tenant */
            $stmt = $this->context->pdo()->prepare(
                'SELECT COUNT(`group_uid`) AS `count`
                FROM `group`
                WHERE `group_uid` IN (' . implode(',', $groups). ')
                    AND tenant_id = :tenant'
            );
            $stmt->bindValue(':tenant', $tenand_id, PDO::PARAM_INT);
            $stmt->execute();
            $countResult = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($countResult['count'] !== count($groups)) {
                throw new FinalException(
                    var_export($countResult, true) . 'Trying to set group that does\'t exist',
                    ERR_BAD_REQUEST
                );
            }

            /* get current user group and create delete and insert array */
            $stmt = $this->context->pdo()->prepare(
                'SELECT `groupuser_group`
                FROM `groupuser`
                WHERE `groupuser_user` = :user AND `tenant_id` = :tenant
                FOR UPDATE'
            );
            $stmt->bindValue(':user', $userid, PDO::PARAM_INT);
            $stmt->bindValue(':tenant', $tenand_id, PDO::PARAM_INT);
            $stmt->execute();
            $in_db = array_column(
                $stmt->fetchAll(PDO::FETCH_ASSOC),
                'groupuser_group'
            );

            $delete = array_diff($in_db, $groups);
            $insert = array_diff($groups, $in_db);

            if (!empty($delete)) {
                $stmt = $this->context->pdo()->prepare(
                    'DELETE FROM `groupuser` 
                    WHERE `groupuser_user` = :user
                        AND `tenant_id` = :tenant
                        AND `groupuser_group` = :group'
                );
                $stmt->bindValue(':user', $userid, PDO::PARAM_INT);
                $stmt->bindValue(':tenant', $tenand_id, PDO::PARAM_INT);
                foreach ($delete as $group) {
                    $stmt->bindValue(':group', $group, PDO::PARAM_INT);
                    $stmt->execute();
                }
            }

            if (!empty($insert)) {
                $stmt = $this->context->pdo()->prepare(
                    'INSERT INTO `groupuser` VALUES (:user, :group, :tenant)'
                );
                $stmt->bindValue(':user', $userid, PDO::PARAM_INT);
                $stmt->bindValue(':tenant', $tenand_id, PDO::PARAM_INT);
                foreach ($insert as $group) {
                    $stmt->bindValue(':group', $group, PDO::PARAM_INT);
                    $stmt->execute();
                }
            }
            $this->context->pdo()->exec('COMMIT');
            return (object)['success' => true];
        } catch (Exception $e) {
            $this->context->pdo()->exec('ROLLBACK');
            throw $e;
        }
    }

    /**
     * Add user into a group
     */
    public function addUser(string|int $groupid, string|int $userid): stdClass
    {
        try {
            $this->contex->rbac()->can(
                $this->context->auth(),
                get_class($this),
                __FUNCTION__
            );

            $userApi = new User($this->context);
            $user = $userApi->get($userid);
            $group = $this->get($groupid);
            $tenant_id = $this->context->auth->get_tenant_id();

            $this->context->rbac()->cmpTenant($this->context->auth(), $user, $group);

            $stmt = $this->context->pdo->prepare(
                'INSERT INTO groupuser (groupuser_user, groupuser_group, tenant_id)
                VALUES (:user, :group, :tenant)'
            );
            $stmt->bindValue(":user", $user->id, PDO::PARAM_INT);
            $stmt->bindValue(":group", $group->id, PDO::PARAM_INT);
            $stmt->bindValue(':tenant', $tenant_id, PDO::PARAM_INT);
            $stmt->execute();

            return (object)['success' => true];
        } catch (Exception $e) {
            throw new Exception('Error adding user to group', ERR_INTERNAL, $e);
        }
    }

    /**
     * Remove user from a group
     */
    public function removeUser(string|int $groupid, string|int $userid): stdClass
    {
        try {
            $this->context->rbac()->can(
                $this->context->auth(),
                get_class($this),
                __FUNCTION__
            );

            $userApi = new User($this->context);
            $user = $userApi->get($userid);
            $group = $this->get($groupid);
            $tenant_id = $this->context->auth()->get_tenant_id();

            $this->context->rbac()->cmpTenant($this->context->auth(), $user, $group);

            $stmt = $this->context->pdo()->prepare(
                'DELETE FROM groupuser
                WHERE groupuser_user = :user
                    AND groupuser_group = :group
                    AND tenant_id = :tenant'
            );
            $stmt->bindValue(":user", $user->id, PDO::PARAM_INT);
            $stmt->bindValue(":group", $group->id, PDO::PARAM_INT);
            $stmt->bindValue(':tenant', $tenant_id, PDO::PARAM_INT);
            $stmt->execute();

            return (object)['success' => true];
        } catch (Exception $e) {
            throw new Exception('Error removing user', ERR_INTERNAL, $e);
        }
    }

    /**
     * Get a group by id
     */
    public function get(string|int $id): stdClass
    {
        try {
            $this->context->rbac()->can(
                $this->context->auth(),
                get_class($this),
                __FUNCTION__
            );

            $stmt = $this->context->pdo()->prepare(
                "SELECT group_uid, group_name, group_description
                FROM `group`
                WHERE group_uid = :gid
                AND tenant_id = :tenant"
            );
            $stmt->bindValue(":gid", self::normalizeId($id), PDO::PARAM_INT);
            $stmt->bindValue(
                ":tenant",
                $this->context->auth()->get_tenant_id(),
                PDO::PARAM_INT
            );
            $stmt->execute();
            return $this->normalizeEgressUserGroup(
                (object) $this->unprefix(
                    $stmt->fetch(PDO::FETCH_ASSOC)
                )
            );
        } catch (Exception $e) {
            throw new Exception('Group not found', ERR_INTERNAL, $e);
        }
    }

    /**
     * Create a new group
     */
    protected function create(stdClass $ugroup): stdClass
    {
        $stmt = $this->context->pdo()->prepare(
            'INSERT INTO `group`
                (group_uid, group_name, group_description, group_deleted, tenant_id)
            VALUES (:id, :name, :description, 0, :tenant)'
        );
        $id = self::get63();
        $stmt->bindValue(":id", $id, PDO::PARAM_INT);
        $stmt->bindValue(":name", $ugroup->name, PDO::PARAM_STR);
        $stmt->bindValue(":description", $ugroup->description, PDO::PARAM_STR);
        $stmt->bindValue(
            ":tenant",
            $this->context->auth()->get_tenant_id(),
            PDO::PARAM_INT
        );

        try {
            $stmt->execute();
        } catch (Exception $e) {
            if ($stmt->errorCode() === SQLStdErr::DUPLICATE_KEY) {
                throw new FinalException('Groupe déjà existant', ERR_DUPLICATE, $e);
            }
            throw $e;

        }
        return $this->get($id);
    }

    /**
     * Update a group
     */
    protected function update(stdClass $ugroup): stdClass
    {
        $stmt = $this->context->pdo()->prepare(
            'UPDATE `group`
            SET name = :name, description = :description
            WHERE uid = :id AND tenant_id = :tenant'
        );
        $stmt->bindValue(":id", $ugroup->id, PDO::PARAM_INT);
        $stmt->bindValue(":name", $ugroup->name, PDO::PARAM_STR);
        $stmt->bindValue(":description", $ugroup->description, PDO::PARAM_STR);
        $stmt->bindValue(
            ":tenant",
            $this->context->auth()->get_tenant_id(),
            PDO::PARAM_INT
        );
        $stmt->execute();
        return $this->get($ugroup->id);
    }

    /**
     * Create or update a group.
     */
    public function set(stdClass $ugroup): stdClass
    {
        try {
            $this->context->rbac()->can(
                $this->context->auth(),
                get_class($this),
                __FUNCTION__
            );
            $ugroup = $this->normalizeIngressUserGroup($ugroup);
            if (empty($ugroup->id)) {
                return $this->create($ugroup);
            } else {
                return $this->update($ugroup);
            }

        } catch (Exception $e) {
            if ($e instanceof FinalException) {
                throw $e;
            }
            throw new Exception('Cannot set group', ERR_INTERNAL, $e);
        }
    }
}
