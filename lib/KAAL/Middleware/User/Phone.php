<?php

namespace KAAL\Middleware\User;

use Exception;
use Generator;
use KAAL\Utils\MixedID;
use KAAL\Utils\Normalizer;
use KAAL\Utils\VException;
use Snowflake53\ID;
use stdClass;
use PDO;

trait Phone
{
    use MixedID;
    use ID;
    use Normalizer;

    protected function normalizeIngressPhone(stdClass $phone): stdClass
    {
        if (isset($phone->_id)) {
            $phone->id = $phone->_id;
        }
        if (empty($phone->id)) {
            $phone->id = self::get63($this->context->machine_id);
        } else {
            $phone->id = self::normalizeId($phone->id);
        }
        if (!isset($phone->kind)) {
            $phone->kind = 'MOBILE';
        } else {
            switch ($phone->kind) {
                case 'MOBILE':
                case 'FIX':
                case 'OTHER':
                    break;
                default:
                    $phone->kind = 'MOBILE';
                    break;
            }
        }
        if (!isset($phone->number)) {
            throw new VException('number');
        } else {
            $phone->number = self::normalizePhoneNumber($phone->number);
        }
        if (!isset($phone->extension)) {
            $phone->extension = '';
        } else {
            $phone->extension = self::normalizeString($phone->extension);
        }
        return $phone;
    }

    protected function normalizeEgressPhone(stdClass $phone): stdClass
    {
        $_phone = new stdClass();

        $_phone->id = strval(self::normalizeId($phone->id));
        $_phone->_id = $_phone->id;
        if (!isset($phone->rkind)) {
            $_phone->relation_kind = '';
        } else {
            $_phone->relation_kind = self::normalizeString($phone->rkind);
        }
        if (!isset($phone->since)) {
            $_phone->relation_since = '';
        } else {
            $_phone->relation_since = self::normalizeDate($phone->since);
        }
        if (!isset($phone->priority)) {
            $_phone->relation_priority = 0;
        } else {
            $_phone->relation_priority = self::normalizeInt($phone->priority);
        }
        $_phone->_order = $_phone->relation_priority;

        if (!isset($phone->kind)) {
            $_phone->kind = 'MOBILE';
        } else {
            switch ($phone->kind) {
                case 'MOBILE':
                case 'FIX':
                case 'OTHER':
                    $_phone->kind = $phone->kind;
                    break;
                default:
                    $_phone->kind = 'MOBILE';
                    break;
            }
        }
        if (!isset($phone->extension)) {
            $_phone->extension = '';
        } else {
            $_phone->extension = self::normalizeString($phone->extension);
        }
        if (!isset($phone->number)) {
            throw new VException('number');
        } else {
            $_phone->number = self::normalizePhoneNumber($phone->number);
        }
        return $_phone;
    }

    protected function getRelationFromPhone(stdClass $phone): stdClass
    {
        $relation = new stdClass();
        $vars = get_object_vars($phone);
        foreach ($vars as $key => $value) {
            if (str_starts_with($key, 'relation_')) {
                $relation->{substr($key, 9)} = $value;
            }
        }
        if (!isset($relation->kind)) {
            $relation->kind = 'PRIVATE';
        }
        if (!isset($relation->since)) {
            $relation->since = '';
        }
        if (!isset($relation->priority)) {
            $relation->priority = 0;
        }
        return $relation;

    }

    private function _setPhone(int $tenant_id, stdClass $phone): bool
    {
        $stmt = $this->context->pdo()->prepare('
            INSERT INTO phones (id, tenant_id, number, extension, kind)
            VALUES (:id, :tenant_id, :number, :extension, :kind)
            ON DUPLICATE KEY UPDATE number = VALUES(number),
                extension = VALUES(extension), kind = VALUES(kind)
            ');
        $stmt->bindValue(':id', $phone->id, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':number', $phone->number, PDO::PARAM_STR);
        $stmt->bindValue(':extension', $phone->extension, PDO::PARAM_STR);
        $stmt->bindValue(':kind', $phone->kind, PDO::PARAM_STR);
        return $stmt->execute();
    }

    private function _deletePhone(int $tenant_id, int $id): bool
    {
        $stmt = $this->context->pdo()->prepare('
            DELETE FROM phones WHERE id = :id AND tenant_id = :tenant_id
        ');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    private function _deleteRelation(int $tenant_id, int $userid, int $phone_id): bool
    {
        $stmt = $this->context->pdo()->prepare('
            DELETE FROM phone_to_entity
            WHERE tenant_id = :tenant_id AND entity_id = :userid AND phone_id = :phone_id
        ');
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':phone_id', $phone_id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    private function _setRelation(int $tenant_id, int $entity_id, int $phone_id, stdClass $relation): bool
    {
        $stmt = $this->context->pdo()->prepare('
            INSERT INTO phone_to_entity(tenant_id, phone_id, entity_id, kind, priority, since)
            VALUES (:tenant_id, :phone_id, :entity_id, :kind, :priority, :since)
            ON DUPLICATE KEY UPDATE kind = VALUES(kind), priority = VALUES(priority),
                since = VALUES(since)
        ');
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':phone_id', $phone_id, PDO::PARAM_INT);
        $stmt->bindValue(':entity_id', $entity_id, PDO::PARAM_INT);
        $stmt->bindValue(':kind', $relation->kind, PDO::PARAM_STR);
        $stmt->bindValue(':priority', $relation->priority, PDO::PARAM_INT);
        $stmt->bindValue(':since', $relation->since, PDO::PARAM_STR);
        return $stmt->execute();
    }

    /**
     * @return Generator<stdClass>
     */
    public function setPhones(stdClass|int|string $userid, stdClass $phones): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $userid = self::normalizeId($userid);
        $tenant_id = $this->context->auth()->get_tenant_id();
        try {
            $this->context->pdo()->beginTransaction();
            foreach (array_merge($phones->modified, $phones->created) as $phone) {
                $phone = $this->normalizeIngressPhone($phone);
                $relation = $this->getRelationFromPhone($phone);
                if (!$this->_setPhone($tenant_id, $phone)) {
                    throw new Exception('Database error');
                }
                if (!$this->_setRelation($tenant_id, $userid, $phone->id, $relation)) {
                    throw new Exception('Database error');
                }
                yield $phone;
            }
            foreach ($phones->deleted as $phone) {
                $phone = $this->normalizeIngressPhone($phone);
                if (!$this->_deleteRelation($tenant_id, $userid, $phone->id)) {
                    throw new Exception('Database error');
                }
                if (!$this->_deletePhone($tenant_id, $phone->id)) {
                    throw new Exception('Database error');
                }
            }
            $this->context->pdo()->commit();
        } catch (Exception $e) {
            var_dump($e);
            if ($this->context->pdo()->inTransaction()) {
                $this->context->pdo()->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @return Generator<stdClass>
     */
    public function listPhones(stdClass|int|string $userid): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        $userid = self::normalizeId($userid);
        $tenant_id = $this->context->auth()->get_tenant_id();
        $stmt = $this->context->pdo()->prepare('
            SELECT id, phones.kind, number, extension,
                pe.kind AS rkind, pe.priority AS priority, pe.since AS since
            FROM phone_to_entity AS pe
            LEFT JOIN phones ON id = phone_id
            WHERE pe.tenant_id = :tenant_id AND entity_id = :userid
        ');
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->execute();
        while (($row = $stmt->fetch(PDO::FETCH_OBJ)) !== false) {
            yield $this->normalizeEgressPhone($row);
        }
    }

    /**
     * @return Generator<stdClass>
     */
    public function listEmergencyPhones(stdClass|int|string $userid): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        $userid = self::normalizeId($userid);
        $tenant_id = $this->context->auth()->get_tenant_id();
        $stmt = $this->context->pdo()->prepare('
            SELECT id, phones.kind, number, extension,
                pe.kind AS rkind, pe.priority AS priority, pe.since AS since
            FROM phone_to_entity AS pe
            LEFT JOIN phones ON id = phone_id
            WHERE pe.tenant_id = :tenant_id AND entity_id = :userid
                AND pe.kind = "EMERGENCY"
        ');
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->execute();
        while (($row = $stmt->fetch(PDO::FETCH_OBJ)) !== false) {
            yield $this->normalizeEgressPhone($row);
        }
    }

}
