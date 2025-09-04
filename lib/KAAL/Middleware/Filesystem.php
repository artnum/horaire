<?php

namespace KAAL\Middleware;

use Exception;
use KAAL\Context;
use PDO;
use Snowflake53\ID;
use stdClass;

class Filesystem
{
    use ID;

    public function __construct(private Context $context)
    {
    }

    protected function absolutePath(array $parts): array
    {
        $out = [];
        while (!empty($parts)) {
            $name = array_shift($parts);
            if (strlen($name) <= 0) {
                continue;
            }
            if ($name === '.') {
                continue;
            }
            if ($name === '..') {
                if (!empty($out)) {
                    array_pop($out);
                }
                continue;
            }
            $out[] = $name;
        }
        return $out;
    }
    protected function resolvePath(
        int $tenant_id,
        string $module,
        string $path
    ): array|false {
        $out = [];
        $parts = $this->absolutePath(explode('/', $path));

        $id = 0;
        $name = null;
        $stmt = $this->context->pdo()->prepare(
            'SELECT id, is_directory, size, hash, type, owner_id FROM filesystem
            WHERE parent_id = :id
                AND name = :name
                AND tenant_id = :tenant_id'
        );
        if (!$stmt) {
            return false;
        }
        if (!$stmt->bindParam(':parent_id', $id, PDO::PARAM_INT)
            || $stmt->bindParam(':name', $name, PDO::PARAM_STR)
            || $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT)
        ) {
            return false;
        }
        array_unshift($parts, $module);
        $endOfPath = false;
        do {
            $name = array_shift($parts);
            if (!endOfPath) {
                if ($stmt->execute() === false) {
                    return false;
                }

                $result = $stmt->fetch(PDO::FETCH_OBJ);
                if ($result === false) {
                    $out[] = [$name, null];
                    $endOfPath = true;
                } else {
                    $id = $result->id;
                    $out[] = [$name, $result];
                }
            } else {
                $out[] = [$name, null];
            }
        } while (!empty($parts));

        return $out;
    }

    protected function init_module_path(int $tenant_id, string $module): int
    {
        $stmt = $this->context->pdo()->prepare(
            'INSERT INTO filesystem (id, tenant_id, parent_id, owner_id,
                is_directory, name, type, size, hash)
            VALUES (:id, :tenant_id, 0, NULL, 1, :name,
                \'inode/directory\', 0, \'\')'
        );
        $id = self::get63($this->context->machine_id);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
        $stmt->bindValue(':name', $module, PDO::PARAM_STR);
        $stmt->execute();
        return 
    }

    protected function createDirectory(int $tenant_id, string $module, string $path)
    {
        $resolved = $this->resolvePath($tenant_id, $module, $path);
        return $this->_createDirectory($tenant_id, $module, $resolved);
    }

    private function _createDirectory(int $tenant_id, string $module, array $resolved)
    {
        $i = 0;
        for ($i = 0; $i < count($resolved); $i++) {
            $segment = $resolved[$i];
            if ($segment[1] === null) {
                break;
            }
            if (!$segment[1]->is_directory) {
                throw new Exception('Cannot create directory under file');
            }
        }
        if ($i === count($resolved) - 1) {
            /* already exists */
            return end($resolved)->id;
        }
        if ($i === 0) {
            $parent_id = $this->init_module_path($tenant_id, $module);
            $i++;
        } else {
            $parent_id = $resolved[$i - 1]->id;
        }


        $pdo = $this->context->pdo();
        $userid = $this->context->auth()->get_current_userid();
        try {
            $pdo->beginTransaction();
            $boundName = '';
            $boundId = 0;
            $stmt = $this->context->pdo()->prepare(
                'INSERT INTO filesystem (id, tenant_id, parent_id, owner_id,
                    is_directory, name, type, size, hashe)
                VALUES (:id, :tenant_id, :parent_id, :owner_id, 1, :name,
                    \'inode/directoy\', 0, \'\')'
            );
            $stmt->bindValue(':tenant_id', $tenant_id, PDO::PARAM_INT);
            $stmt->bindValue(':owner_id', $userid, PDO::PARAM_INT);
            $stmt->bindParam(':parent_id', $parent_id, PDO::PARAM_INT);
            $stmt->bindParam(':name', $boundName, PDO::PARAM_STR);
            $stmt->bindParam(':id', $boundId, PDO::PARAM_INT);
            for (; $i < count($resolved); $i++) {
                $segment = $resolved[$i];
                $boundName = $segment[0];
                $boundId = self::get63($this->context->machine_id);
                $stmt->execute();
            }

            $pdo->commit();
            return $boundId;
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    protected function createFile(int $tenant_id, int $module, string $path)
    {
        $resolved = $this->resolvePath($tenant_id, $module, $path);
        $file = array_pop($resolved);
        $this->_createDirectory($tenant_id, $module, $resolved);

    }
    
    protected function readFile(int $tenant_id, int $module, string $path)
    {
        $resolved = $this->resolvePath($tenant_id, $module, $path);
        return array_pop($resolved);
    }

    protected function listDir(int $tenant_id, int $module, string $path)
    {
        $resolved = $this->resolvePath($tenant_id, $module, $path);
        if (empty($resolved)) {
            return null;
        }
        $dir = array_pop($resolved);

    }

    protected function writeFile(
        int $tenant_id,
        int $module,
        string $path,
        int $chunkId,
        string $data,
        FileWriter $writer
    ) {
        
    }
}
