<?php

namespace KAAL\Middleware\User;

use DateTime;
use Exception;
use Generator;
use KAAL\Utils\MixedID;
use KAAL\Utils\Normalizer;
use KAAL\Utils\VException;
use stdClass;
use Snowflake53\ID;
use PDO;

trait Children
{
    use MixedID;
    use Normalizer;
    use ID;

    protected function normalizeChild(stdClass $child): stdClass
    {
        if (!empty($child->_id)) {
            $child->id = $child->_id;
        }
        if (empty($child->id)) {
            $child->id = self::get63($this->context->machine_id);
        } else {
            $child->id = self::normalizeId($child->id);
        }

        if (empty($child->birthday)) {
            throw new VException('birthday');
        }
        if (empty($child->firstname)) {
            throw new VException('firstname');
        }
        if (empty($child->lastname)) {
            throw new VException('lastname');
        }

        $child->birthday = self::normalizeDate($child->birthday);
        if (empty($child->deduction_start)) {
            /* deduction starts the first day of the month after birthday */
            $bday = new DateTime($child->birthday);
            $bday->setDate(intval($bday->format('Y')), intval($bday->format('m')) + 1, 1);
            $child->deduction_start = $bday->format('Y-m-d');
        } else {
            $child->deduction_start = self::normalizeDate($child->deduction_start);
        }
        $child->firstname = self::normalizeString($child->firstname);
        $child->lastname = self::normalizeString($child->lastname);
        return $child;
    }
    protected function normalizeEgressChild(stdClass $child): stdClass
    {
        if (empty($child->id)) {
            throw new Exception('Database error');
        }
        $child->id = strval(self::normalizeId($child->id));

        if (empty($child->birthday)) {
            throw new Exception('Database error');
        }
        if (empty($child->firstname)) {
            throw new Exception('Database error');
        }
        if (empty($child->lastname)) {
            throw new Exception('Database error');
        }

        $child->birthday = self::normalizeDate($child->birthday);
        if (empty($child->deduction_start)) {
            /* deduction starts the first day of the month after birthday */
            $bday = new DateTime($child->birthday);
            $bday->setDate(intval($bday->format('Y')), intval($bday->format('m')) + 1, 1);
            $child->deduction_start = $bday->format('Y-m-d');
        } else {
            $child->deduction_start = self::normalizeDate($child->deduction_start);
        }
        $child->firstname = self::normalizeString($child->firstname);
        $child->lastname = self::normalizeString($child->lastname);
        return $child;
    }

    private function _setChild(int $userid, int $tenant_id, stdClass $child): stdClass
    {
        $stmt = $this->context->pdo()->prepare('
            INSERT INTO children (id, person_id, tenant_id, firstname, lastname, birthday, deduction_start)
            VALUES (:id, :userid, :tenant_id, :firstname, :lastname, :birthday, :deduction_start)
            ON DUPLICATE KEY UPDATE  firstname = VALUES(firstname), lastname = VALUES(lastname),
                birthday = VALUES(birthday), deduction_start = VALUES(deduction_start)
            ');
        $stmt->bindValue(':id', $child->id, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':firstname', $child->firstname, PDO::PARAM_STR);
        $stmt->bindValue(':lastname', $child->lastname, PDO::PARAM_STR);
        $stmt->bindValue(':birthday', $child->birthday, PDO::PARAM_STR);
        $stmt->bindValue(':deduction_start', $child->deduction_start, PDO::PARAM_STR);
        $stmt->execute();
        return $child;
    }

    private function _deleteChild(int $userid, int $tenant_id, stdClass $child): stdClass
    {
        $stmt = $this->context->pdo()->prepare('
            DELETE FROM children
            WHERE id = :id AND person_id = :userid AND tenant_id = :tenant_id
        ');
        $stmt->bindValue(':id', $child->id, PDO::PARAM_INT);
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->execute();
        return $child;
    }

    /**
     * @return Generator<stdClass>
     */
    public function setChildren(int|string|stdClass $userid, stdClass $children): Generator
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

            foreach (array_merge($children->modified, $children->created) as $child) {
                $child = $this->normalizeChild($child);
                yield $this->_setChild($userid, $tenant_id, $child);
            }
            foreach ($children->deleted as $child) {
                $child = $this->normalizeChild($child);
                yield $this->_deleteChild($userid, $tenant_id, $child);
            }
            $this->context->pdo()->commit();
        } catch (Exception $e) {
            if ($this->context->pdo()->inTransaction()) {
                $this->context->pdo()->rollBack();
            }
            throw $e;
        }
    }

    /**
     * @return Generator<stdClass>
     */
    public function listChildren(int|string|stdClass $userid): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        $userid = self::normalizeId($userid);
        $tenant_id = $this->context->auth()->get_tenant_id();
        $stmt = $this->context->pdo()->prepare('
            SELECT id, firstname, lastname, birthday, deduction_start
            FROM children
            WHERE tenant_id = :tenant_id AND person_id = :userid
            ORDER BY birthday ASC    
        ');
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':userid', $userid, PDO::PARAM_INT);
        $stmt->execute();

        $i = 0;
        while (($row = $stmt->fetch(PDO::FETCH_OBJ)) !== false) {
            $child = $this->normalizeEgressChild($row);
            $child->_order = ++$i;
            $child->_id = $child->id;
            yield $child;
        }
    }

}
