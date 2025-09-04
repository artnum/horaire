<?php

namespace KAAL\Middleware;

use Generator;
use KAAL\Utils\MixedID;
use KAAL\Utils\Normalizer;
use KAAL\Context;
use Exception;
use stdClass;
use PDO;

/**
 * Handle access endpoint. Allow client side to set access rights and check
 * if user can perform an action
 */
class Access
{
    use MixedID;
    use Normalizer;
    /**
     * Constructor
     *
     * @param \KAAL\Context $context The application $context
     */
    public function __construct(private Context $context)
    {
    }

    /**
     * As there is still code that rely on legacy access level, convert the
     * roles array into an access level.
     *
     * @param array $roles List of roles.
     *
     * @return int An access level
     */
    private function converRoleToLegacyAccessLevel(array $roles): int
    {
        $manageAll = ['offer', 'time-admin', 'project', 'user'];
        if (empty(array_diff($manageAll, $roles))) {
            return 16;
        }
        $manageProcessTimeProject = ['time-admin', 'project'];
        if (empty(array_diff($manageProcessTimeProject, $roles))) {
            return 32;
        }
        $manageProjectProcess = ['project'];
        if (empty(array_diff($manageProjectProcess, $roles))) {
            return 64;
        }

        return 256;
    }

    /**
     * Update the access level of a user.
     *
     * @param int $userid The user id
     * @param int $level  The level of access
     *
     * @return void Nothing of value was lost
     *
     * @throws Exception PDO is set to throw on errror
     */
    private function setLegacyAccessLevel(int $userid, int $level): void
    {
        $stmt = $this->context->pdo()->prepare(
            'UPDATE `person` SET `person_level` = :level WHERE `person_id` = :id'
        );
        $stmt->bindValue(':level', $level, PDO::PARAM_INT);
        $stmt->bindValue(':id', $userid, PDO::PARAM_INT);
        $stmt->execute();
    }


    public function deleteUserRoles(int|string|stdClass $userid): stdClass
    {
        $tenant_id = $this->context->auth()->get_tenant_id();
        $userid = self::normalizeId($userid);

        $stmt = $this->context->pdo()->prepare(
            'DELETE FROM `acls` WHERE `person_id` = :user AND `tenant_id` = :tenant'
        );
        $stmt->bindValue(':user', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':tenant', $tenant_id, PDO::PARAM_INT);
        $stmt->execute();
        return (object)['success' => true];
    }

    /**
     * Get all roles for a user
     *
     * @param int|string|stdClass $userid The user id or a user object
     *
     * @return array a list of roles
     */
    public function getUserRoles(int|string|stdClass $userid): Generator
    {
        $tenant_id = $this->context->auth()->get_tenant_id();
        $userid = self::normalizeId($userid);
        $stmt = $this->context->pdo()->prepare(
            'SELECT `module`
                FROM `acls`
                WHERE `person_id` = :person_id AND `tenant_id` = :tenant_id
                FOR UPDATE'
        );
        $stmt->bindValue(':person_id', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->execute();
        while (($row = $stmt->fetch(PDO::FETCH_OBJ)) !== false) {
            yield (object) ['id' => $row->module];
        }
    }


    /**
     * Set roles for a user.
     *
     * @param $userid The user to which to set roles
     * @param $roles  List of roles
     *
     * @return stdClass Success if success
     *
     * @throws Exception
     */
    public function setUserRoles(int|string|stdClass $userid, array $roles): stdClass
    {
        $tenant_id = $this->context->auth()->get_tenant_id();
        $userid = self::normalizeId($userid);
        $roles = array_values(
            array_filter(
                array_map(
                    fn ($v) => self::normalizeString($v),
                    $roles
                ),
                fn ($role) => $this->context->rbac()->isExistingRole($role)
            )
        );
        $roles = $this->context->rbac()->resolveInferences($roles);

        $this->context->pdo()->exec('START TRANSACTION');
        try {
            $in_db = array_column(
                iterator_to_array(
                    $this->getUserRoles($userid)
                ),
                'id'
            );
            $delete = array_diff($in_db, $roles);
            $insert = array_diff($roles, $in_db);

            if (!empty($delete)) {
                $stmt = $this->context->pdo()->prepare(
                    'DELETE FROM `acls`
                    WHERE `person_id` = :person_id AND `tenant_id` = :tenant_id
                        AND `module` = :module'
                );

                $stmt->bindValue(':person_id', $userid, PDO::PARAM_INT);
                $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
                foreach ($delete as $module) {
                    $stmt->bindValue(':module', $module, PDO::PARAM_STR);
                    $stmt->execute();
                }
            }

            if (!empty($insert)) {
                $stmt = $this->context->pdo()->prepare(
                    'INSERT IGNORE INTO `acls` (`person_id`, `tenant_id`, `module`)
                VALUES(:person_id, :tenant_id, :module)'
                );

                $stmt->bindValue(':person_id', $userid, PDO::PARAM_INT);
                $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
                foreach ($insert as $module) {
                    $stmt->bindValue(':module', $module, PDO::PARAM_STR);
                    $stmt->execute();
                }
            }

            $this->setLegacyAccessLevel(
                $userid,
                $this->converRoleToLegacyAccessLevel($roles)
            );
            $this->context->pdo()->exec('COMMIT');
            return (object)['success' => true];
        } catch (Exception $e) {
            $this->context->pdo()->exec('ROLLBACK');
            throw $e;
        }
    }

    /**
     * Get all roles available
     *
     * @return stdClass An object with each role as key.
     */
    public function getRoles(): stdClass
    {
        return $this->context->rbac()->getRoles();
    }

    /**
     * Check if user can do an operation. It is purely informative as the
     * check will happen when the request is done and some other conditions
     * might block the operation.
     *
     * @param string $ns       The namespace the operation belong to
     * @param string $function The function to run in the namespace
     *
     * @return stdClass A class with field result either true or false
     */
    public function can(string $ns, string $function): stdClass
    {
        try {
            $this->context->rbac()->can($this->context->auth(), $ns, $function);
            return (object) ['result' => true];
        } catch (Exception $e) {
            for (; $e; $e = $e->getPrevious()) {
                error_log($e->getMessage());
            }

            return (object)['result' => false];
        }
    }
}
