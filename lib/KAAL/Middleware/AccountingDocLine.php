<?php
namespace KAAL\Middleware;

use STQuery\STQuery as Search;
use KAAL\Backend\{Cache, Storage};
use KaalDB\PDO\PDO;
use Exception;
use stdClass;
use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};
use Snowflake53\ID;
use Normalizer;
use KAAL\Utils\MixedID;
use MonoRef\Backend\IStorage;
use Generator;

class AccountingDocLine {
    use ID;
    use MixedID;
    protected PDO $pdo;
    protected IStorage $cache;

    function __construct(PDO $pdo, IStorage $cache) {
        $this->pdo = $pdo;
        $this->cache = $cache;
    }

    protected static function normalizeEgressLine (stdClass $line) {
        $line->id = strval($line->id) ?? '0';
        $line->position = strval($line->position) ?? null;
        $line->description = strval($line->description) ?? null;
        $line->quantity = floatval($line->quantity) ?? null;
        $line->price = floatval($line->price) ?? null;
        $line->type = $line->type ?? null;
        $line->state = $line->state ?? 'open';
        $line->unit = strval($line->unit) ?? null;
        return $line;
    }

    protected static function normalizeIngressLine (stdClass $line) {
        if (isset($line->id)) { $line->id = self::normalizeId($line->id); }
        $line->position = Normalizer::normalize(strval($line->position)) ?? null;
        $line->description = Normalizer::normalize(strval($line->description)) ?? null;
        $line->quantity = floatval($line->quantity) ?? null;
        $line->price = floatval($line->price) ?? null;
        $line->type = $line->type ?? null;
        $line->state = $line->state ?? 'open';
        $line->unit = Normalizer::normalize(strval($line->unit)) ?? null;
        return $line;
    }

    function _rawSearch(stdClass $search, bool $forUpdate = false):Generator
    {
        $JSearch = new Search();
        $JSearch->setSearch($search);
        list ($where, $bindings) = $JSearch->toPDO();
        $stmt = $this->pdo->prepare('SELECT id FROM accountingDocLine WHERE ' . $where . ($forUpdate ? ' FOR UPDATE' : ''));
        foreach($bindings as $placeholder => $binding) {
            $stmt->bindValue($placeholder, $binding['value'], $binding['type']);
        }
        $stmt->execute();
        while ($line = $stmt->fetch(PDO::FETCH_OBJ)) {
            yield $line->id;
        }
    }

    function search (stdClass $search) {
        foreach($this->_rawSearch($search) as $id) {
            yield $this->get($id);
        }
    }

    function setStates (string|int|stdClass $docId, string $state = 'frozen') {
        try {
            $docId = self::normalizeId($docId);
            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare('UPDATE accountingDocLine SET state = :state WHERE docId = :docId');
            $stmt->bindValue(':state', $state, PDO::PARAM_STR);
            $stmt->bindValue(':docId', $docId, PDO::PARAM_INT);
            $stmt->execute();
            $this->pdo->commit();
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error setting state', ERR_INTERNAL, $e);
        }
    }

    function freeze (string|int|stdClass $id) {
        $id = self::normalizeId($id);
        try { 
            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare('UPDATE accountingDocLine SET state = :state WHERE id = :id');
            $stmt->bindValue(':state', 'frozen', PDO::PARAM_STR);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $this->pdo->commit();
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error locking line', ERR_INTERNAL, $e);
        }
    }

    function unfreeze (string|int $id) {
        try {
            $id = self::normalizeId($id);
            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare('UPDATE accountingDocLine SET state = :state WHERE id = :id');
            $stmt->bindValue(':state', 'open', PDO::PARAM_STR);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $this->pdo->commit();
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error locking line', ERR_INTERNAL, $e);
        }
    }

    function get (string|int $id) {
        $id = self::normalizeId($id);
        $stmt = $this->pdo->prepare('SELECT * FROM accountingDocLine WHERE id = :id');
        $stmt->bindValue(':id', intval($id), PDO::PARAM_INT);
        $stmt->execute();
        return self::normalizeEgressLine($stmt->fetch(PDO::FETCH_OBJ));
    }

    function gets (string|int $docId = null) {
        $docId = self::normalizeId($docId);
        $docAPI = new AccountingDoc($this->pdo, $this->cache);
        $parents = $docAPI->_getParents($docId);
        $parents[] = $docId;
        $stmt = $this->pdo->prepare('SELECT id FROM accountingDocLine WHERE docId IN (' . implode(',', $parents) . ')');
        $stmt->execute();
        while ($line = $stmt->fetch(PDO::FETCH_ASSOC)) {
            yield $this->get($line['id']);
        }
    }

    /* change state of line, e.g. from OPEN to FROZEN, this is the only way to
     * to change line state.
     */
    function setState (array|null $lines = null) {
        if (empty($lines)) {
            throw new Exception('No lines to update', ERR_BAD_REQUEST);
        }
        $stmt = $this->pdo->prepare('UPDATE accountingDocLine SET state = :state WHERE id = :id');
        $this->pdo->beginTransaction();
        try {
            foreach ($lines as $line) {
                $stmt->execute([':state' => $line->state, ':id' => $line->id]);
            }
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error updating line', ERR_INTERNAL ,$e);
        }
        $this->pdo->commit();
    }

    function delete (string|int $id) {
        $id = self::normalizeId($id);
        $stmt = $this->pdo->prepare('DELETE FROM accountingDocLine WHERE id = :id');
        yield ['deleted' => ['id' => $id, 'success' => $stmt->execute([':id' => $id])]];
    }

    function add (stdClass $line, string|int $docId = null) {
        if (empty($line) || empty($docId)) {
            throw new Exception('No line to add');
        }
        $docId = self::normalizeId($docId);
        $line = self::normalizeIngressLine($line);
        $id = $this->get64();
        $this->pdo->beginTransaction();
        $stmt = $this->pdo->prepare('INSERT INTO accountingDocLine (
            id,
            position,
            description,
            quantity,
            price,
            type,
            state,
            unit,
            docId
        ) VALUES (
            :id,
            :position,
            :description,
            :quantity,
            :price,
            :type,
            :state,
            :unit,
            :docId
        )');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':position', $line->position, PDO::PARAM_STR);
        $stmt->bindValue(':description', $line->description, PDO::PARAM_STR);
        $stmt->bindValue(':quantity', $line->quantity, PDO::PARAM_STR);
        $stmt->bindValue(':price', $line->price, PDO::PARAM_STR);
        $stmt->bindValue(':type', $line->type, PDO::PARAM_STR);
        $stmt->bindValue(':state', $line->state, PDO::PARAM_STR);
        $stmt->bindValue(':unit', $line->unit, PDO::PARAM_STR);
        $stmt->bindValue(':docId', $docId, PDO::PARAM_INT);
        $success = $stmt->execute();
        if (!$success) {
            $this->pdo->rollBack();
            return ['added' => ['id' => $this->get($id), 'success' => $success]];
        }
        $this->pdo->commit();
        return ['added' => ['line' => $this->get($id), 'success' => $success]];
    }

    function set (array $lines = null, string|int $docId) {
        $docId = self::normalizeId($docId);

        $stmt = $this->pdo->prepare('SELECT * FROM accountingDocLine WHERE docId = :docId FOR UPDATE');
        $stmt->execute([':docId' => $docId]);

        $this->pdo->beginTransaction();
        try {
            $toUpdate = [];
            while($l = $stmt->fetch(PDO::FETCH_OBJ)) {
                $l = self::normalizeIngressLine($l);
                $foundLine = false;
                foreach ($lines as $k => $line) {
                    $line = self::normalizeIngressLine($line);
                    if (!isset($line->id) || $line->id === 0) { continue; }
                    if ($l->id === $line->id) {
                        $foundLine = $line;
                        unset($lines[$k]);
                        break;
                    }
                }
                if ($l->state !== 'open') {
                    continue; /* skip lines that are not open */
                }
                if (!$foundLine) {
                    yield $this->delete($l->id)->current();
                    continue;
                }
                if ($foundLine) { $toUpdate[] = $foundLine; }
            }
            
            foreach ($toUpdate as $line) {
                $stmt = $this->pdo->prepare('UPDATE accountingDocLine SET 
                        position = :position,
                        description = :description,
                        quantity = :quantity,
                        price = :price,
                        type = :type,
                        state = :state,
                        unit = :unit
                    WHERE id = :id');
                $stmt->bindValue(':position', $line->position, PDO::PARAM_STR);
                $stmt->bindValue(':description', $line->description, PDO::PARAM_STR);
                $stmt->bindValue(':quantity', $line->quantity, PDO::PARAM_STR);
                $stmt->bindValue(':price', $line->price, PDO::PARAM_STR);
                $stmt->bindValue(':type', $line->type, PDO::PARAM_STR);
                $stmt->bindValue(':state', $line->state, PDO::PARAM_STR);
                $stmt->bindValue(':unit', $line->unit, PDO::PARAM_STR);
                $stmt->bindValue(':id', $line->id, PDO::PARAM_INT);
                $stmt->execute();
                yield ['updated' => ['line' => $this->get(strval($line->id)), 'success' => true]];
            }

            foreach ($lines as $line) {
                yield $this->add($line, $docId);
            }
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
        $this->pdo->commit();
    }
}