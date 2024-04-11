<?php
namespace KAAL\Middleware;

require('AccountingDocLine.php');

use STQuery\STQuery as Search;
use Exception;
use Generator;
use MonoRef\Backend\IStorage;
use KAAL\Utils\Reference;
use stdClass;
use Normalizer;
use KaalDB\PDO\PDO;
use KAAL\Backend\{Cache, Storage};
use Snowflake53\ID;
use KAAL\Utils\MixedID;


use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};

class AccountingDoc  {
    use ID;
    use MixedID;
    protected PDO $pdo;
    protected Reference $ref;
    protected IStorage $cache;

    function __construct(PDO $pdo, IStorage $cache) {
        $this->pdo = $pdo;
        $this->pdo->beginTransaction();
        $this->ref = new Reference($cache);
        $this->cache = $cache;
    }

    function __destruct()
    {
        if ($this->pdo->inTransaction()) {
            $this->pdo->commit();
        }
    }

    protected function normalizeEgressDocument (stdClass $document):stdClass {
        if (empty($document)) {
            throw new Exception('No document provided', ERR_BAD_REQUEST);
        }

        if (!empty($document->id)) {
            $document->id = strval($document->id);
        }

        if (!empty($document->baseid)) {
            $document->baseid = strval($document->baseid);
        } else {
            $document->baseid = strval(0);
        }

        if (!empty($document->relid)) {
            $document->relid = strval($document->relid);
        } else {
            $document->relid = strval(0);
        }

        $document->created = intval($document->created);
        unset($document->deleted);

        if (empty($document->name)) {
            $document->name = '';
        }
        $document->name = trim(Normalizer::normalize($document->name));

        if (empty($document->description)) {
            $document->description = '';
        }
        $document->description = trim(Normalizer::normalize($document->description));

        if (empty($document->condition)) {
            $document->condition = strval(0);
        } else {
            $document->condition = strval($document->condition);
        }

        if (empty($document->date)) {
            $document->date = date('Y-m-d H:i');
        } else {
            $document->date = date('Y-m-d H:i', strtotime($document->date));
        }

        $document->project = strval($document->project);
        $document->type = strval($document->type);
        $document->state = strval($document->state);
        return $document;
    }



    protected function normalizeIngressDocument (stdClass $document):stdClass {
        if (empty($document)) {
            throw new Exception('No document provided', ERR_BAD_REQUEST);
        }

        if (!empty($document->id)) {
            $document->id = $this->normalizeId($document->id);
        }

        if (!empty($document->baseid)) {
            if(empty($document->project) || empty($document->type) || empty($document->condition)) {
                throw new Exception('No project provided', ERR_BAD_REQUEST);
            }
        } else {
            $document->baseid = 0;
        }

        if (empty($document->relid)) {
            $document->relid = 0;
        }

        if (empty($document->created)) {
            $document->created = time();
        }

        if (empty($document->name)) {
            $document->name = '';
        }

        if (empty($document->description)) {
            $document->description = '';
        }

        if (empty($document->condition)) {
            $document->condition = 0;
        }

        if (empty($document->deleted)) {
            $document->deleted = 0;
        }

        if (empty($document->date)) {
            $document->date = date('Y-m-d H:i');
        } else {
            $document->date = date('Y-m-d H:i', strtotime($document->date));
        }
    
        $document->project = intval($document->project);
        $document->baseid = intval($document->baseid);
        $document->relid = intval($document->relid);
        $document->condition = intval($document->condition);
        $document->created = intval($document->created);
        $document->deleted = intval($document->deleted);
        $document->type = strval($document->type);
        $document->name = Normalizer::normalize(strval($document->name));
        $document->description = Normalizer::normalize(strval($document->description));

        return $document;
    }

    public function search (stdClass $search):Generator {
        try {
            $JSearch = new Search($search);
            list ($where, $values) = $JSearch->toPDO();
            $stmt = $this->pdo->prepare(
                'SELECT id FROM accountingDoc 
                 WHERE ' . $where . '
                 ORDER BY id DESC'
            );
            error_log('SELECT id FROM accountingDoc WHERE ' . $where . ' ORDER BY id DESC');
            foreach ($values as $key => $value) {
                $stmt->bindValue($key, $value['value'], $value['type']);
            }
            $stmt->execute();
            while($row = $stmt->fetch(PDO::FETCH_OBJ)) {
                yield $this->get(strval($row->id));
            }
        } catch (Exception $e) {
            throw new Exception('Error searching documents', ERR_INTERNAL, $e);
        }
    }

    private function getRawDocument (string|int $id):stdClass {
        try {
            $stmt = $this->pdo->prepare('SELECT * FROM accountingDoc WHERE id = :id');
            $stmt->bindValue(':id', $this->normalizeId($id), PDO::PARAM_INT);
            $stmt->execute();
            return $this->normalizeEgressDocument($stmt->fetch(PDO::FETCH_OBJ));
        } catch (Exception $e) {
            throw new Exception('Error getting document', ERR_INTERNAL, $e);
        }
    }

    public function freeze (string|int $id):stdClass {
        try {
            $linesAPI = new AccountingDocLine($this->pdo, $this->cache);
            $docId = $this->normalizeId($id);
            $this->pdo->beginTransaction();
            foreach ($linesAPI->_rawSearch((object) ['docid' => $id, 'type' => 'item'], true) as $id) {
                $linesAPI->freeze($id);
            }
            $stmt = $this->pdo->prepare('UPDATE accountingDoc SET state = :state WHERE id = :id');
            $stmt->bindValue(':state', 'frozen', PDO::PARAM_STR);
            $stmt->bindValue(':id', $docId, PDO::PARAM_INT);
            $stmt->execute();
            $this->pdo->commit();
            return $this->get($docId);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error locking document', ERR_INTERNAL, $e);
        }
    }

    public function get (string|int $id):stdClass {
        try {
            $id = $this->normalizeId($id);
            $document = $this->getRawDocument($id);
            if ($document->relid) {
                $baseDoc = $this->get($document->relid);
                if (empty($baseDoc)) {
                    throw new Exception('Base document not found', ERR_BAD_REQUEST);
                }
                foreach ($baseDoc as $key => $value) {
                    switch($key) {
                        case 'deleted':
                        case 'created':
                        case 'id':
                            continue 2;
                    }
                    if (!isset($document->$key) || empty($document->$key)) {
                        $document->$key = $value;
                    }
                }
            }
            return $this->normalizeEgressDocument($document);
        } catch (Exception $e) {
            throw new Exception('Error getting document', ERR_INTERNAL, $e);
        }
    }

    public function list ():Generator {
        try {
            $stmt = $this->pdo->prepare(
                    'SELECT id FROM accountingDoc 
                     WHERE deleted = 0 
                     ORDER BY id DESC'
                    );
            $stmt->execute();
            while($row = $stmt->fetch(PDO::FETCH_OBJ)) {
                yield $this->get($row->id);
            }
        } catch (Exception $e) {
            throw new Exception('Error getting documents', ERR_INTERNAL, $e);
        }
    }

    public function create (stdClass $document):stdClass {
        $document = $this->normalizeIngressDocument($document);
        $this->pdo->beginTransaction();
        try {
            $baseid = 0;
            if ($document->baseid) {
                $baseDoc = $this->get($document->relid);
                if (empty($baseDoc)) {
                    throw new Exception('Base document not found', ERR_BAD_REQUEST);
                }
                $baseid = intval($baseDoc->baseid);
            }
            $relid = 0;
            if ($document->relid) {
                $relDoc = $this->get($document->relid);
                if (empty($relDoc)) {
                    throw new Exception('Related document not found', ERR_BAD_REQUEST);
                }
                $relid = intval($relDoc->id);
            }
            
            $stmt = $this->pdo->prepare('INSERT INTO accountingDoc 
                    (
                        id,
                        reference,
                        project,
                        name,
                        description,
                        date,
                        type,
                        created,
                        baseid,
                        relid
                    ) 
                    VALUES (
                        :id,
                        :reference,
                        :project,
                        :name,
                        :description,
                        :date,
                        :type, 
                        :created,
                        :baseid,
                        :relid
                    )'
                );

            $stmt->bindValue(':project', $document->project, PDO::PARAM_INT);
            $stmt->bindValue(':baseid', $baseid, PDO::PARAM_INT);
            $stmt->bindValue(':relid', $relid, PDO::PARAM_INT);
            $stmt->bindValue(':type', $document->type, PDO::PARAM_STR);
            $stmt->bindValue(':created', time(), PDO::PARAM_INT);
            $stmt->bindValue(':name', $document->name, PDO::PARAM_STR);
            $stmt->bindValue(':description', $document->description, PDO::PARAM_STR);
            $stmt->bindValue(':date', date('Y-m-d H:i'), PDO::PARAM_STR);

            $id = $this->get64();
            $stmt->bindValue(':id', intval($id), PDO::PARAM_INT);
            $stmt->bindValue(':reference', $this->ref->get('ACCOUNTINGDOC', 'O:yy:-:id04:'), PDO::PARAM_STR);

            $stmt->execute();
            $this->pdo->commit();
            return $this->get($id);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error creating document', ERR_INTERNAL, $e);
        }
    }

    public function update (stdClass $document):stdClass {
        $document = $this->normalizeIngressDocument($document);

        $originalDocument = $this->getRawDocument($document->id);
        if (empty($originalDocument)) {
            throw new Exception('Document not found', ERR_BAD_REQUEST);
        }
        $document = $this->normalizeIngressDocument($document);
        foreach ($originalDocument as $key => $value) {
            if ($key === 'id') {
                continue;
            }
            if (empty($document->$key)) {
                $document->$key = $originalDocument->$key;
            }
        }

        $this->pdo->beginTransaction();
        try {    
            $stmt = $this->pdo->prepare(
                    'UPDATE accountingDoc SET 
                        name = :name,
                        description = :description
                    WHERE id = :id'
                );
            $stmt->bindValue(':id', intval($document->id), PDO::PARAM_INT);
            $stmt->bindValue(':name', $document->name, PDO::PARAM_STR);
            $stmt->bindValue(':description', $document->description, PDO::PARAM_STR);

            $stmt->execute();
            $this->pdo->commit();
            return $this->get($document->id);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error updating document', ERR_INTERNAL, $e);
        }
    }

    public function delete (stdClass|int|string $id):stdClass {
        try {
            if (is_object($id)) {
                $id = $id->id;
            }
            $id = $this->normalizeId($id);

            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare(
                'UPDATE accountingDoc
                 SET deleted = :deleted
                 WHERE id = :id'
            );
            $stmt->bindValue(':deleted', time(), PDO::PARAM_INT);
            $stmt->bindValue(':id', intval($id), PDO::PARAM_INT);
            $stmt->execute();
            $this->pdo->commit();
            return  (object) ['deleted' => ['id' => intval($id), 'success' => true]];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error deleting document', ERR_INTERNAL, $e);
        }
    }
}