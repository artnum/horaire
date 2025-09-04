<?php

namespace KAAL\Middleware;

use KAAL\Context;
use KAAL\Crypto;
use KAAL\Utils\FinalException;
use KAAL\Utils\MixedID;
use Snowflake53\ID;
use stdClass;
use PDO;

class Configuration
{
    use ID;
    use MixedID;

    public const SQL_QUERIES = [
        'get' => 'SELECT id, key_path, value, encrypted, private 
            FROM configurations
            WHERE key_path = :key_path AND tenant_id = :tenant_id',
        'setPrivate' => 'INSERT INTO configurations (id, key_path, tenant_id, value)
            VALUES (:id, :key_path, :tenant_id, :value)'
    ];

    public function __construct(protected Context $context)
    {
    }

    protected function internalGet(string $keyPath): stdClass
    {
        $stmt = $this->context->pdo()->prepare(self::SQL_QUERIES['get']);
        $stmt->bindValue(':key_path', $keyPath, PDO::PARAM_STR);
        $stmt->bindValue(':tenant_id', $this->context->auth()->get_tenant_id(), PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_OBJ);
        if ($row === false) {
            throw new FinalException('Does not exists');
        }
        if ($row->encrypted) {
            $row->value = Crypto::strDecrypt(
                $row->value,
                $this->context->conf()->get('db.key')
            );
        }
        return $row;
    }

    protected function internalSet(string $keyPath, string $value): bool
    {
        $stmt = $this->context->pdo()->prepare(self::SQL_QUERIES['set']);
    }

    public function get(string $keyPath): stdClass
    {
        $row = $this->internalGet($keyPath);
        $fn = __FUNCTION__ . ($row->private ? 'Private' : 'Public');
        $this->context->rbac(
            $this->context->auth(),
            get_class($this),
            $fn
        );
        $value = $row->value;
        if ($row->encrypted) {

        }
        return (object) [
            $keyPath => $value
        ];
    }

    public function set(string $confPath, string $value, bool $private = false)
    {
        $fn = __FUNCTION__ . ($private ? 'Private' : 'Public');
        $this->context->rbac(
            $this->context->auth(),
            get_class($this),
            $fn
        );
    }
}
