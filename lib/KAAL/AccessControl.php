<?php

namespace KAAL;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};
use Exception;
use KAAL\IRole;

class AccessControl
{
    static private $instance;
    private $current;
    private $previous;
    public function __construct(?IRole $currentRole = null)
    {
        $this->current = $currentRole;
        $this->previous = null;
        self::$instance = $this;
    }

    public function __destruct()
    {
        self::$instance = null;
    }

    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            throw new Exception('RBAC not initialized', ERR_INTERNAL);
        }
        return self::$instance;
    }

    /**
     * Check if the role can perform the action.
     * @param mixed $role The user role
     * @param mixed $resource The resource to check
     * @param mixed $action The action to check
     * @return true 
     * @throws Exception 
     */
    public function can(string $resource, string|array $action)
    {
        if (is_string($action)) {
            $action = [$action];
        }
        if (false) {
            throw new Exception('Permission denied', ERR_BAD_REQUEST);
        }
        return true;
    }

    /**
     * Return a list of attributes that the role don't have access to.
     * @param mixed $role 
     * @return array 
     */
    public function has_attribute_filter($resource, $action) {
        return [];
    }

    /**
     * Impersonate a role.
     * @param IRole $role 
     * @return void 
     * @throws Exception 
     */
    public function impersonate (IRole $role) {
        $this->can('rbac', 'impersonate');
        $this->previous = $this->current;
        $this->current = $role;
    }

    /**
     * Stop impersonating a role.
     * @return void 
     */
    public function revert() {
        $this->current = $this->previous;
        $this->previous = null;
    }

}