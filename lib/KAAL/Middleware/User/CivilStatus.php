<?php

namespace KAAL\Middleware\User;

use Exception;
use Generator;
use KAAL\Utils\MixedID;
use KAAL\Utils\Normalizer;
use stdClass;
use PDO;

trait CivilStatus
{
    use MixedID;
    use Normalizer;

    protected function normalizeStatus(stdClass $status): stdClass
    {
        if (empty($status->status)) {
            $status->status = 'UNKNOWN';
        }
        switch ($status->status) {
            default:
                $status->status = 'UNKNOWN';
                break;
            case 'UNKNOWN':
            case 'SINGLE':
            case 'MARRIED':
            case 'WIDOWED':
            case 'DIVORCED':
            case 'SEPARATED':
            case 'REG_PART':
            case 'DISS_JUD':
            case 'DISS_DEC':
            case 'PART_ABS':
                break;
        }
        if (empty($status->since)) {
            $status->since = '0001-01-01';
        } else {
            $status->since = self::normalizeDate($status->since);
        }
        return $status;
    }

    /**
     * @return Generator<stdClass>
     */
    public function listCivilStatuses(int|string|stdClass $userid): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );

        $userid = self::normalizeId($userid);
        $tenant_id = $this->context->auth()->get_tenant_id();

        $stmt = $this->context->pdo()->prepare('
            SELECT status, since
            FROM civil_status
            WHERE person_id = :person_id AND tenant_id = :tenant_id
            ORDER BY since DESC
        ');
        $stmt->bindValue(':person_id', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->execute();

        $i = 0;
        while (($row = $stmt->fetch(PDO::FETCH_OBJ)) !== false) {
            $status = $this->normalizeStatus($row);
            /* give an id because frontend may need an id */
            $status->_id = (string)hash('xxh3', $userid . $tenant_id . $status->since);
            $status->_order = ++$i;
            yield $status;
        }
    }

    /**
     * @return Generator<stdClass>
     */
    public function setCivilStatuses(int|string|stdClass $userid, stdClass $statuses): Generator
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

            foreach (array_merge($statuses->modified, $statuses->created) as $status) {
                $status = $this->normalizeStatus($status);
                yield $this->_setCivilStatus($userid, $tenant_id, $status);
            }
            foreach ($statuses->deleted as $status) {
                $status = $this->normalizeStatus($status);
                yield $this->_deleteCivilStatus($userid, $tenant_id, $status);
            }
            $this->context->pdo()->commit();
        } catch (Exception $e) {
            if ($this->context->pdo()->inTransaction()) {
                $this->context->pdo()->rollBack();
            }
            throw $e;
        }

    }

    private function _deleteCivilStatus(int $userid, int $tenant_id, stdClass $status): stdClass
    {
        $stmt = $this->context->pdo()->prepare(
            'DELETE FROM civil_status
            WHERE person_id = :person_id
                AND tenant_id = :tenant_id
                AND since = :since
                AND status =  :status'
        );
        $stmt->bindValue(':person_id', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':since', $status->since, PDO::PARAM_STR);
        $stmt->bindValue(':status', $status->status, PDO::PARAM_STR);
        $stmt->execute();

        return $status;
    }

    private function _setCivilStatus(int $userid, int $tenant_id, stdClass $status): stdClass
    {
        $stmt = $this->context->pdo()->prepare(
            'INSERT INTO civil_status (person_id, tenant_id, since, status)
            VALUES (:person_id, :tenant_id, :since, :status)
            ON DUPLICATE KEY UPDATE since = VALUES(since), status = VALUES(status)'
        );
        $stmt->bindValue(':person_id', $userid, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':since', $status->since, PDO::PARAM_STR);
        $stmt->bindValue(':status', $status->status, PDO::PARAM_STR);
        $stmt->execute();
        return $status;
    }
}
