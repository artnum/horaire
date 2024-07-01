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
use KAAL\Utils\{MixedID, Base26};
use MonoRef\Backend\IStorage;
use Generator;
use KAAL\AccessControl;

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
        $rbac = AccessControl::getInstance();
        $line->id = strval($line->id) ?? '0';
        $line->docid = strval($line->docid) ?? '0';
        $line->position = strval($line->position) ?? null;
        $line->posref = strval($line->posref) ?? '';
        $line->description = strval($line->description) ?? null;
        $line->quantity = floatval($line->quantity) ?? null;
        $line->price = floatval($line->price) ?? null;
        $line->type = $line->type ?? null;
        $line->related = strval($line->related) ?? null;
        $line->state = $line->state ?? 'open';
        $line->unit = strval($line->unit) ?? null;

        if (isset($line->docref)) {
            $line->docref = $line->docref . '_' . Base26::encode($line->docvariant);
        }

        $filters = $rbac->has_attribute_filter('docline', 'read');
        foreach ($filters as $filter) {
            unset($line->$filter);
        }

        return $line;
    }

    protected static function normalizeIngressLine (stdClass $line) {
        $rbac = AccessControl::getInstance();
        $filters = $rbac->has_attribute_filter('docline', 'write');
        foreach ($filters as $filter) {
            unset($line->$filter);
        }
    
        if (isset($line->id)) { $line->id = self::normalizeId($line->id); }
        if (isset($line->docid)) { $line->docid = self::normalizeId($line->docid); }
        $line->posref = isset($line->posref) ? Normalizer::normalize(strval($line->posref)) : '';
        $line->position = Normalizer::normalize(strval($line->position)) ?? null;
        $line->description = Normalizer::normalize(strval($line->description)) ?? null;
        $line->quantity = floatval($line->quantity) ?? null;
        $line->price = floatval($line->price) ?? null;
        $line->type = $line->type ?? null;
        $line->state = $line->state ?? 'open';
        if (!empty($line->related) && $line->related !== null) {
            $line->related = self::normalizeId($line->related) ?? null;
        } else {
            $line->related = null;
        }
        $line->unit = Normalizer::normalize(strval($line->unit)) ?? null;
        return $line;
    }

    function _rawSearch(stdClass $search, bool $forUpdate = false):Generator
    {
        $JSearch = new Search();
        $JSearch->setSearch($search);
        list ($where, $bindings) = $JSearch->toPDO();
        $stmt = $this->pdo->prepare('SELECT id FROM accountingDocLine WHERE ' . $where . ' ORDER BY position ASC ' . ($forUpdate ? ' FOR UPDATE' : ''));
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

    function lock (string|int|stdClass $id) {
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

    function unlock (string|int $id) {
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
        $stmt = $this->pdo->prepare('SELECT l.*,d.reference AS docref, d.variant AS docvariant
            FROM accountingDocLine AS l 
            LEFT JOIN accountingDoc AS d ON l.docid = d.id  
            WHERE l.id = :id');
        $stmt->bindValue(':id', intval($id), PDO::PARAM_INT);
        $stmt->execute();
        return self::normalizeEgressLine($stmt->fetch(PDO::FETCH_OBJ));
    }

    function gets (string|int $docId = null) {
        $docId = self::normalizeId($docId);
        $docAPI = new AccountingDoc($this->pdo, $this->cache);
        $parents[] = $docId;
        $parent = $docAPI->_getDirectParent($docId);
        if ($parent !== null) {
            $parents[] = $parent;
        }
        $stmt = $this->pdo->prepare('SELECT id FROM accountingDocLine WHERE docId IN (' . implode(',', $parents) . ') ORDER BY position ASC');
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
            posref,
            description,
            quantity,
            price,
            type,
            related,
            state,
            unit,
            docId
        ) VALUES (
            :id,
            :position,
            :posref,
            :description,
            :quantity,
            :price,
            :type,
            :related,
            :state,
            :unit,
            :docId
        )');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':position', $line->position, PDO::PARAM_STR);
        $stmt->bindValue(':posref', $line->posref, PDO::PARAM_STR);
        $stmt->bindValue(':description', $line->description, PDO::PARAM_STR);
        $stmt->bindValue(':quantity', $line->quantity, PDO::PARAM_STR);
        $stmt->bindValue(':price', $line->price, PDO::PARAM_STR);
        $stmt->bindValue(':type', $line->type, PDO::PARAM_STR);
        if ($line->related === null) {
            $stmt->bindValue(':related', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':related', $line->related, PDO::PARAM_INT);
        }
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

    function copy ($from, $to) {
        $selection = $this->pdo->prepare('SELECT * FROM accountingDocLine WHERE docid = :from');
        $selection->bindValue(':from', $from, PDO::PARAM_INT);
        $selection->execute();
        while (($line = $selection->fetch(PDO::FETCH_OBJ)) !== false) {
            $id = $this->get64();
            $stmt = $this->pdo->prepare('INSERT INTO accountingDocLine (
                id,
                position,
                description,
                posref,
                quantity,
                price,
                type,
                related,
                state,
                unit,
                docId
            ) VALUES (
                :id,
                :position,
                :description,
                :posref,
                :quantity,
                :price,
                :type,
                :related,
                :state,
                :unit,
                :docId
            )');
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':position', $line->position, PDO::PARAM_STR);
            $stmt->bindValue(':posref', $line->posref, PDO::PARAM_STR);
            $stmt->bindValue(':description', $line->description, PDO::PARAM_STR);
            $stmt->bindValue(':quantity', $line->quantity, PDO::PARAM_STR);
            $stmt->bindValue(':price', $line->price, PDO::PARAM_STR);
            $stmt->bindValue(':type', $line->type, PDO::PARAM_STR);
            $stmt->bindValue(':related', null, PDO::PARAM_NULL);
            $stmt->bindValue(':state', $line->state, PDO::PARAM_STR);
            $stmt->bindValue(':unit', $line->unit, PDO::PARAM_STR);
            $stmt->bindValue(':docId', $to, PDO::PARAM_INT);
            $stmt->execute();
        }
    }

    function update (stdClass $line) {
        $line = self::normalizeIngressLine($line);
        $stmt = $this->pdo->prepare('UPDATE accountingDocLine SET 
            position = :position,
            posref = :posref,
            description = :description,
            quantity = :quantity,
            price = :price,
            type = :type,
            related = :related,
            state = :state,
            unit = :unit
        WHERE id = :id');
        $stmt->bindValue(':position', $line->position, PDO::PARAM_STR);
        $stmt->bindValue(':posref', $line->posref, PDO::PARAM_STR);
        $stmt->bindValue(':description', $line->description, PDO::PARAM_STR);
        $stmt->bindValue(':quantity', $line->quantity, PDO::PARAM_STR);
        $stmt->bindValue(':price', $line->price, PDO::PARAM_STR);
        $stmt->bindValue(':type', $line->type, PDO::PARAM_STR);
        if ($line->related === null) {
            $stmt->bindValue(':related', null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue(':related', $line->related, PDO::PARAM_INT);
        }
        $stmt->bindValue(':state', $line->state, PDO::PARAM_STR);
        $stmt->bindValue(':unit', $line->unit, PDO::PARAM_STR);
        $stmt->bindValue(':id', $line->id, PDO::PARAM_INT);
        $stmt->execute();
        return ['updated' => ['line' => $this->get($line->id), 'success' => true]];
    }

    function set (array $lines = null, string|int $docId) {
        $docId = self::normalizeId($docId);

        $stmt = $this->pdo->prepare('SELECT * FROM accountingDocLine WHERE docId = :docId FOR UPDATE');
        $stmt->execute([':docId' => $docId]);

        /* Order matters because position are set on the client side and 
         * positions are part of a constraints (but not anymore) :
         *  1. Delete, so we free position
         *  2. Update, so we set position
         *  3. Add, so we have position correctly set
         */
        $this->pdo->beginTransaction();
        try {
            $toUpdate = [];
            while($l = $stmt->fetch(PDO::FETCH_OBJ)) {
                $l = self::normalizeIngressLine($l);
                $foundLine = false;
                foreach ($lines as $k => &$line) {
                    $line = self::normalizeIngressLine($line);

                    /* if no document set, it belongs to that document and must be
                     * added
                     */
                    if (!isset($line->docid)) { $line->docid = $docId; continue; }

                    /* line sent does not belong to this doc, skip */
                    if ($line->docid !== $docId) { 
                        unset($lines[$k]);
                        continue; 
                    }

                    if (!isset($line->id) || $line->id === 0) { continue; }

                    if ($l->id === $line->id) {
                        $foundLine = $line;
                        unset($lines[$k]);
                        break;
                    }
                }
                if ($l->state !== 'open') {
                    unset($lines[$k]);
                    continue; /* skip lines that are not open */
                }
                if (!$foundLine) {           
                    yield $this->delete($l->id)->current();
                    continue;
                }
                if ($foundLine) { $toUpdate[] = $foundLine; }
            }
            foreach ($toUpdate as $line) {
                yield $this->update($line);
            }

            foreach ($lines as $line) {
                if (isset($line->docid) && $line->docid !== $docId) { continue; }
                yield $this->add($line, $docId);
            }
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
        $this->pdo->commit();
    }
}