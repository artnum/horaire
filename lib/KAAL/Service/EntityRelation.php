<?php

namespace KAAL\Service;

use Exception;
use PDO;
use DateTime;

class EntityRelation
{
    public const KIND_MAX_LENGTH = 10;
    private const tables = [
        'address' => ['address_to_entity', 'address_id'],
        'phone' => ['phone_to_entity', 'phone_id']
    ];

    private const sql_queries = [
        'create' => 'INSERT INTO %s (tenant_id, %s, entity_id, kind, priority, since)
                     VALUES (:tid, :oid, :eid, :kind, :priority, :since);',
        'update' => 'UPDATE %s SET kind = :kind, since = :since, priority = :priority
                     WHERE tenant_id = :tid, entity_id = :eid, %s = :oid;',
        'delete' => 'DELETE FROM %s WHERE tenant_id = :tid, entity_id = :eid, %s = :oid'

    ];

    public function __construct(private PDO $pdo, private string $type)
    {
    }

    private function _get_query(string $type): string
    {
        if (!isset($this->sql_queries[$type])) {
            throw new Exception('Invalid query');
        }
        return sprintf(
            $this->sql_queries[$type],
            $this->tables[$this->type][0],
            $this->tables[$this->type[1]]
        );
    }

    private function _run_db(string $query, int $object_id, int $entity_id, int $tenant_id, string $kind = null, DateTime $since = null): void
    {
        if ($since === null) {
            $since = '';
        } else {
            $since = $since->format('Y-m-d');
        }
        if (mb_strlen($kind) > self::KIND_MAX_LENGTH) {
            throw new Exception("Invalid parameters");
        }

        $stmt = $this->pdo->prepare($this->_get_query($query));
        $stmt->bindValue(':tid', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':oid', $object_id, PDO::PARAM_INT);
        $stmt->bindValue(':eid', $entity_id, PDO::PARAM_INT);
        if ($query != 'delete') {
            if ($kind === null || $since === null) {
                throw new Exception("Invalid parameters");
            }
            $stmt->bindValue(':kind', $kind, PDO::PARAM_STR);
            $stmt->bindValue(':since', $since, PDO::PARAM_STR);
        }
        $stmt->execute();
    }

    public function create(int $object_id, int $entity_id, int $tenant_id, string $kind, DateTime|null $since): void
    {
        $this->_run_db('create', $object_id, $entity_id, $tenant_id, $kind, $since);
    }

    public function update(int $object_id, int $entity_id, int $tenant_id, string $kind, DateTime|null $since): void
    {
        $this->_run_db('update', $object_id, $entity_id, $tenant_id, $kind, $since);
    }

    public function delete(int $object_id, int $entity_id, int $tenant_id): void
    {
        $this->_run_db('delete', $object_id, $entity_id, $tenant_id);
    }
}
