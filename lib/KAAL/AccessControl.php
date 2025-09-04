<?php

namespace KAAL;

use stdClass;
use Exception;
use PDO;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL, ERR_FORBIDDEN};

/**
 * Simple AccessControl base on a module. Each users has access to some modules
 * and each module has access to some RPC Call. When a RPC Call is done, it
 * verify that user can do it by seeing if he has access to a module that
 * allows that RPC Call.
 *
 * @category Authentication
 * @package  KAAL\AAA
 * @author   Etienne Bagnoud <etienne@artnum.ch>
 * @license  MIT https://opensource.org/license/mit
 */
class AccessControl
{
    /**
     * Constructor obviously, the linter require me to add a description
     *
     * @param array $definition List of definiion for roles and access
     * @param PDO   $db         A PDO object to access the database
     */
    public function __construct(private array $definition, private PDO $db)
    {

    }

    /**
     * Compare tenant of two objects. They must match.
     *
     * @param Auth     $auth The auth object
     * @param stdClass $a    First object with _tenant_id as field
     * @param stdClass $b    Second object with _tenant_id as a field
     *
     * @return true Always true if tenants are the same
     * @throws Exception A forbidden exception if tenants are different
     */
    public function cmpTenant(Auth $auth, stdClass $a, stdClass $b): true
    {
        if (empty($a->_tenant_id)) {
            throw new Exception('Forbidden');
        }
        if (empty($b->_tenant_id)) {
            throw new Exception('Forbidden');
        }
        if ($a->_tenant_id !== $b->_tenant_id) {
            throw new Exception('Forbidden');
        }

        if ($auth->get_tenant_id() !== $a->_tenant_id) {
            throw new Exception('Forbidden');
        }

        return true;
    }

    /**
     * Returns roles defined in definition
     *
     * @return stdClass Roles
     */
    public function getRoles(): stdClass
    {
        if (!isset($this->definition['roles'])) {
            return new stdClass();
        }
        return (object) $this->definition['roles'];
    }

    public function isExistingRole(string $role): bool
    {
        if (!isset($this->definition['roles'])) {
            return false;
        }
        if (!isset($this->definition['roles'][$role])) {
            return false;
        }
        return true;
    }

    /**
     * Some roles infer other roles, so this resolve thoses inferences
     *
     * @param array $roles Roles to set
     *
     * @return array Complete roles array with all inferences
     */
    public function resolveInferences(array $roles): array
    {
        $infered = [];
        foreach ($roles as $role) {
            if (!isset($this->definition['roles'][$role])) {
                continue;
            }
            if (!isset($this->definition['roles'][$role]['infer'])) {
                continue;
            }

            $infered = array_merge($this->definition['roles'][$role]['infer'], $infered);
        }
        return array_merge($infered, $roles);
    }

    /**
     * Check if the current user can do the operation
     *
     * @param Auth   $auth      The auth object
     * @param strins $namespace The namespace the operation is in
     * @param string $operation The opertation itself
     *
     * @return true Always true, throws if user can't proceed
     * @throws Exception An exception indicating user can't do the operation
     */
    public function can(
        Auth $auth,
        string $namespace,
        string $operation,
    ): true {
        try {
            $namespace = explode('\\', $namespace);
            $namespace = array_pop($namespace);
            if (!isset($this->definition['rpc'][$namespace])
                || !isset($this->definition['rpc'][$namespace][$operation])
            ) {
                throw new Exception('No definition for endpoint [' . $namespace . '::' . $operation . ']');
            }

            $userid = $auth->get_current_userid();
            if ($userid < 0) {
                throw new Exception('No user identified');
            }

            $requiredModules = $this->definition['rpc'][$namespace][$operation];
            if (empty($requiredModules)) {
                return true; // Edge case: no modules required
            }

            $placeholders = implode(',', array_fill(0, count($requiredModules), '?'));
            $query = "SELECT 1 FROM acls WHERE person_id = ? AND module IN ($placeholders) LIMIT 1";
            $stmt = $this->db->prepare($query);
            $stmt->execute(array_merge([$userid], $requiredModules));
            $result = $stmt->fetch(PDO::FETCH_NUM);

            if ($result) {
                return true;
            }

            throw new Exception('No match found', ERR_BAD_REQUEST);
        } catch (Exception $e) {
            throw new Exception('Permission denied', ERR_FORBIDDEN, $e);
        }
    }
}
