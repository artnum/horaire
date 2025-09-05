<?php

namespace KAAL\Middleware;

use STQuery\STQuery as Search;
use KaalDB\PDO\PDO;
use Exception;
use stdClass;
use Snowflake53\ID;
use Normalizer;
use KAAL\Utils\{MixedID, Base26};
use Generator;
use KAAL\Context;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};

class AccountingDocLine
{
    use ID;
    use MixedID;


    public function __construct(private Context $context)
    {

    }

    protected static function normalizeEgressLine(stdClass $line)
    {
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

        return $line;
    }

    protected static function normalizeIngressLine(stdClass $line)
    {

        if (isset($line->id)) {
            $line->id = self::normalizeId($line->id);
        }
        if (isset($line->docid)) {
            $line->docid = self::normalizeId($line->docid);
        }
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

    public function _rawSearch(stdClass $search, bool $forUpdate = false): Generator
    {
        $JSearch = new Search();
        $JSearch->setSearch($search);
        list($where, $bindings) = $JSearch->toPDO();
        $stmt = $this->context->pdo()->prepare('SELECT id FROM accountingDocLine WHERE ' . $where . ' ORDER BY position ASC ' . ($forUpdate ? ' FOR UPDATE' : ''));
        foreach ($bindings as $placeholder => $binding) {
            $stmt->bindValue($placeholder, $binding['value'], $binding['type']);
        }
        $stmt->execute();
        while ($line = $stmt->fetch(PDO::FETCH_OBJ)) {
            yield $line->id;
        }
    }

    public function search(stdClass $search)
    {
        foreach ($this->_rawSearch($search) as $id) {
            yield $this->get($id);
        }
    }

    public function setStates(string|int|stdClass $docId, string $state = 'frozen')
    {
        try {
            $docId = self::normalizeId($docId);
            $this->context->pdo()->beginTransaction();
            $stmt = $this->context->pdo()->prepare('UPDATE accountingDocLine SET state = :state WHERE docId = :docId');
            $stmt->bindValue(':state', $state, PDO::PARAM_STR);
            $stmt->bindValue(':docId', $docId, PDO::PARAM_INT);
            $stmt->execute();
            $this->context->pdo()->commit();
        } catch (Exception $e) {
            $this->context->pdo()->rollBack();
            throw new Exception('Error setting state', ERR_INTERNAL, $e);
        }
    }

    public function lock(string|int|stdClass $id)
    {
        $id = self::normalizeId($id);
        try {
            $this->context->pdo()->beginTransaction();
            $stmt = $this->context->pdo()->prepare('UPDATE accountingDocLine SET state = :state WHERE id = :id');
            $stmt->bindValue(':state', 'frozen', PDO::PARAM_STR);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $this->context->pdo()->commit();
        } catch (Exception $e) {
            $this->context->pdo()->rollBack();
            throw new Exception('Error locking line', ERR_INTERNAL, $e);
        }
    }

    public function unlock(string|int $id)
    {
        try {
            $id = self::normalizeId($id);
            $this->context->pdo()->beginTransaction();
            $stmt = $this->context->pdo()->prepare('UPDATE accountingDocLine SET state = :state WHERE id = :id');
            $stmt->bindValue(':state', 'open', PDO::PARAM_STR);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $this->context->pdo()->commit();
        } catch (Exception $e) {
            $this->context->pdo()->rollBack();
            throw new Exception('Error locking line', ERR_INTERNAL, $e);
        }
    }

    public function get(string|int $id)
    {
        $id = self::normalizeId($id);
        $stmt = $this->context->pdo()->prepare('SELECT l.*,d.reference AS docref, d.variant AS docvariant
            FROM accountingDocLine AS l 
            LEFT JOIN accountingDoc AS d ON l.docid = d.id  
            WHERE l.id = :id');
        $stmt->bindValue(':id', intval($id), PDO::PARAM_INT);
        $stmt->execute();
        return self::normalizeEgressLine($stmt->fetch(PDO::FETCH_OBJ));
    }

    public function gets(string|int|null $docId)
    {
        $docId = self::normalizeId($docId);
        $docAPI = new AccountingDoc($this->context);
        $parents[] = $docId;
        $parent = $docAPI->_getDirectParent($docId);
        if ($parent !== null) {
            $parents[] = $parent;
        }
        $stmt = $this->context->pdo()->prepare('SELECT id FROM accountingDocLine WHERE docId IN (' . implode(',', $parents) . ') ORDER BY position ASC');
        $stmt->execute();
        while ($line = $stmt->fetch(PDO::FETCH_ASSOC)) {
            yield $this->get($line['id']);
        }
    }

    /* change state of line, e.g. from OPEN to FROZEN, this is the only way to
     * to change line state.
     */
    public function setState(array|null $lines = null)
    {
        if (empty($lines)) {
            throw new Exception('No lines to update', ERR_BAD_REQUEST);
        }
        $stmt = $this->context->pdo()->prepare('UPDATE accountingDocLine SET state = :state WHERE id = :id');
        $this->context->pdo()->beginTransaction();
        try {
            foreach ($lines as $line) {
                $stmt->execute([':state' => $line->state, ':id' => $line->id]);
            }
        } catch (\Exception $e) {
            $this->context->pdo()->rollBack();
            throw new Exception('Error updating line', ERR_INTERNAL, $e);
        }
        $this->context->pdo()->commit();
    }

    public function delete(string|int $id)
    {
        $id = self::normalizeId($id);
        $stmt = $this->context->pdo()->prepare('DELETE FROM accountingDocLine WHERE id = :id');
        yield (object)['deleted' => ['id' => $id, 'success' => $stmt->execute([':id' => $id])]];
    }

    public function add(stdClass $line, string|int|null $docId)
    {
        if (empty($line) || empty($docId)) {
            throw new Exception('No line to add');
        }
        $docId = self::normalizeId($docId);
        $line = self::normalizeIngressLine($line);
        $id = $this->get64();
        $this->context->pdo()->beginTransaction();
        $stmt = $this->context->pdo()->prepare('INSERT INTO accountingDocLine (
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
            $this->context->pdo()->rollBack();
            return (object)['added' => ['id' => $this->get($id), 'success' => $success]];
        }
        $this->context->pdo()->commit();
        return (object)['added' => ['line' => $this->get($id), 'success' => $success]];
    }

    public function copy($from, $to)
    {
        $selection = $this->context->pdo()->prepare('SELECT * FROM accountingDocLine WHERE docid = :from');
        $selection->bindValue(':from', $from, PDO::PARAM_INT);
        $selection->execute();
        while (($line = $selection->fetch(PDO::FETCH_OBJ)) !== false) {
            $id = $this->get64();
            $stmt = $this->context->pdo()->prepare('INSERT INTO accountingDocLine (
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

    public function update(stdClass $line)
    {
        $line = self::normalizeIngressLine($line);
        $stmt = $this->context->pdo()->prepare('UPDATE accountingDocLine SET 
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
        return (object)['updated' => ['line' => $this->get($line->id), 'success' => true]];
    }

    public function set(?array $lines, string|int $docId)
    {
        $docId = self::normalizeId($docId);

        $stmt = $this->context->pdo()->prepare('SELECT * FROM accountingDocLine WHERE docId = :docId FOR UPDATE');
        $stmt->execute([':docId' => $docId]);

        /* Order matters because position are set on the client side and
         * positions are part of a constraints (but not anymore) :
         *  1. Delete, so we free position
         *  2. Update, so we set position
         *  3. Add, so we have position correctly set
         */
        $this->context->pdo()->beginTransaction();
        try {
            $toUpdate = [];
            while ($l = $stmt->fetch(PDO::FETCH_OBJ)) {
                $l = self::normalizeIngressLine($l);
                $foundLine = false;
                foreach ($lines as $k => &$line) {
                    $line = self::normalizeIngressLine($line);

                    /* if no document set, it belongs to that document and must be
                     * added
                     */
                    if (!isset($line->docid)) {
                        $line->docid = $docId;
                        continue;
                    }

                    /* line sent does not belong to this doc, skip */
                    if ($line->docid !== $docId) {
                        unset($lines[$k]);
                        continue;
                    }

                    if (!isset($line->id) || $line->id === 0) {
                        continue;
                    }

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
                if ($foundLine) {
                    $toUpdate[] = $foundLine;
                }
            }
            foreach ($toUpdate as $line) {
                yield $this->update($line);
            }

            foreach ($lines as $line) {
                if (isset($line->docid) && $line->docid !== $docId) {
                    continue;
                }
                yield $this->add($line, $docId);
            }
        } catch (\Exception $e) {
            $this->context->pdo()->rollBack();
            throw $e;
        }
        $this->context->pdo()->commit();
    }
}
