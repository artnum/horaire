<?php
namespace KAAL\Middleware;

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
use KAAL\Utils\{MixedID, Base26};
use KAAL\AccessControl;
use kPDF\Parsedown\Parsedown;
use kPDF\kPDF;
use PhpOffice\PhpWord\TemplateProcessor;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};

class AccountingDoc  {
    use ID;
    use MixedID;
    protected PDO $pdo;
    protected Reference $ref;
    protected IStorage|null $cache;

    function __construct(PDO $pdo, IStorage|null $cache = null) {
        $this->pdo = $pdo;
        $this->pdo->beginTransaction();
        if ($cache !== null) {
            $this->ref = new Reference($cache);
            $this->cache = $cache;
        }
    }

    function __destruct()
    {
        if ($this->pdo->inTransaction()) {
            $this->pdo->commit();
        }
    }

    protected static function normalizeEgressDocument (stdClass $document):stdClass {
        if (empty($document)) {
            throw new Exception('No document provided', ERR_BAD_REQUEST);
        }
        if (empty($document->variant)) {
            $document->variant = 0;
        }

        if (!empty($document->id)) {
            $document->id = strval($document->id);
        }

        if (!empty($document->related)) {
            $document->related = strval($document->related);
        } else {
            $document->related = strval(0);
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

        if ($document->project) {
            $document->project = strval($document->project);
        } else {
            $document->project = null;
        }
        $document->type = strval($document->type);
        return $document;
    }

    protected static function normalizeIngressDocument (stdClass $document):stdClass {
        if (empty($document)) {
            throw new Exception('No document provided', ERR_BAD_REQUEST);
        }

        if (empty($document->variant)) {
            $document->variant = 0;
        } else if (!is_int($document->variant)) {
            if (!ctype_alpha($document->variant)) {
                throw new Exception('Invalid variant', ERR_BAD_REQUEST);
            }
            /* base26 decode */
            $document->variant = Base26::decode($document->variant);
        }

        if (!empty($document->id)) {
            $document->id = self::normalizeId($document->id);
        }

        if (!empty($document->related)) {
            $document->related = strval($document->related);
        }

        if (!empty($document->project)) {
            $document->project = self::normalizeId($document->project);
        } else {
            $document->project = null;
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
        if (isset($document->related)) { $document->related = intval($document->related); }
        else { $document->related = null; }
        $document->condition = intval($document->condition);
        $document->created = intval($document->created);
        $document->deleted = intval($document->deleted);
        $document->type = strval($document->type);
        $document->name = Normalizer::normalize(strval($document->name));
        $document->description = Normalizer::normalize(strval($document->description));

        return $document;
    }

    public function _getIdsForDocument (mixed $docId):array {
        $document = $this->get($docId);
        $ids = [$docId];
        if ($document->type !== 'offer') {
            $ids = array_merge($ids, $this->_getParents($docId));
        }
        return $ids;
    }

    public function _getDirectParent (mixed $docId) {
        $docId = self::normalizeId($docId);
        $stmt = $this->pdo->prepare('SELECT related FROM accountingDoc WHERE id = :id');
        $stmt->bindParam(':id', $docId, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_OBJ);
        if (empty($result)) {
            return null;
        }
        return intval($result->related);
    }

    public function _getParents (mixed $docId):array {
        $docId = self::normalizeId($docId);

        $parents = [];
        $stmt = $this->pdo->prepare('SELECT related FROM accountingDoc WHERE id = :id');
        $stmt->bindParam(':id', $docId, PDO::PARAM_INT);
        do {
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_OBJ);
            if (empty($result)) {
                break;
            }
            $parent = intval($result->related);
            if ($parent === 0) { break; }
            $parents[] = $parent;
            $docId = $parent;
        } while ($parent !== null);
        return $parents;
    }

    public function tree (mixed $docId):stdClass {
        $docId = self::normalizeId($docId);
        $document = $this->get($docId);
        $document->parents = $this->_getParents($docId);
        $document->childs = $this->_getChilds($docId);
        return $document;
    }

    public function listFromDocument(mixed $document):Generator {
        $docId = self::normalizeId($document);
        $docs = [$docId];
        $docs = array_merge($docs, $this->_getParents($docId));
        $docs = array_merge($docs, $this->_getChilds($docId));
        rsort($docs);
        
        foreach($docs as $doc) {
            yield $this->get($doc);
        }
    }

    public function _getChilds (mixed $docId): array {
        $docId = self::normalizeId($docId);

        $childs = [];
        $stmt = $this->pdo->prepare('SELECT id FROM accountingDoc WHERE related = :id');
        $stmt->bindParam(':id', $docId, PDO::PARAM_INT);
        do {
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_OBJ);
            if (empty($result)) {
                break;
            }
            $child = intval($result->id);
            if ($child === 0) { break; }
            $childs[] = $child;
            $docId = $child;
        } while ($child !== null);
        return $childs;
    }

    public function createVariant (string|int|stdClass $document) {
        $rbac = AccessControl::getInstance();
        $rbac->can('accounting', ['write']);
        
        $linesAPI = new AccountingDocLine($this->pdo, $this->cache);

        $docId = self::normalizeId($document);
        $document = $this->get($docId);
        $document->id = null;
        $document = $this->doCreate($document, true);
        $linesAPI->copy($docId, $document->id);

        return $document;
    }

    public function search (stdClass $search):Generator {
        $rbac = AccessControl::getInstance();
        $rbac->can('accounting', ['search']);
        try {
            $JSearch = new Search($search);
            list ($where, $values) = $JSearch->toPDO();
            $stmt = $this->pdo->prepare(
                'SELECT id FROM accountingDoc 
                 WHERE ' . $where . '
                 ORDER BY id DESC'
            );
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

    public function getOffers ():Generator {
        $rbac = AccessControl::getInstance();
        $rbac->can('accounting', ['search']);

        return $this->search((object) ['type' => 'offer', 'deleted' => 0, 'project' => '-']);
    }

    private function getRawDocument (string|int $id):stdClass {
        try {
            $stmt = $this->pdo->prepare('SELECT * FROM accountingDoc WHERE id = :id');
            $stmt->bindValue(':id', self::normalizeId($id), PDO::PARAM_INT);
            $stmt->execute();
            return self::normalizeEgressDocument($stmt->fetch(PDO::FETCH_OBJ));
        } catch (Exception $e) {
            throw new Exception('Error getting document', ERR_INTERNAL, $e);
        }
    }

    public function nextStep (string|int $id):stdClass {
        try {
            $linesAPI = new AccountingDocLine($this->pdo, $this->cache);
            $docId = self::normalizeId($id);
            $this->pdo->beginTransaction();
            foreach ($linesAPI->_rawSearch((object) ['docid' => $id], true) as $id) {
                $linesAPI->lock($id);
            }
            $originalDocument = $this->get($docId);
            switch($originalDocument->type) {
                case 'offer':
                    $type = 'execution';
                    break;
                case 'execution':
                    $type = 'invoice';
                    break;
                default:
                    throw new Exception('Invalid type', ERR_BAD_REQUEST);
            }
            
            $document = new stdClass();
            $document->related = $originalDocument->id;
            $document->type = $type;
            $document->variant = 0;
            /* copying the project attribute set is less flexible but simplify
             * queries. There is almost no chance that a document flow will be
             * set to another projet.
             */ 
            $document->project = $originalDocument->project;

            $new =  $this->create($document);
            $this->pdo->commit();
            return $new;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error locking document', ERR_INTERNAL, $e);
        }
    }

    public function get (string|int $id):stdClass {
        try {
            $id = self::normalizeId($id);
            $document = $this->getRawDocument($id);
            if ($document->related) {
                $baseDoc = $this->get($document->related);
                if (empty($baseDoc)) {
                    throw new Exception('Base document not found', ERR_BAD_REQUEST);
                }
                foreach ($baseDoc as $key => $value) {
                    switch($key) {
                        case 'deleted':
                        case 'created':
                        case 'variant':
                        case 'id':
                            continue 2;
                    }
                    if (!isset($document->$key) || empty($document->$key)) {
                        $document->$key = $value;
                    }
                }
            }
            return self::normalizeEgressDocument($document);
        } catch (Exception $e) {
            throw new Exception('Error getting document', ERR_INTERNAL, $e);
        }
    }

    public function getCurrent (string|stdClass $project):stdClass|null {
        try {
            if (is_object($project)) {
                $project = intval($project->id);
            } else {
                $project = intval($project);
            }

            $stmt = $this->pdo->prepare(
                'SELECT id FROM accountingDoc 
                 WHERE deleted = 0 AND project = :project
                 ORDER BY id DESC LIMIT 1'
            );
            $stmt->bindValue(':project', $project, PDO::PARAM_INT);
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                return null;
            }
            return $this->get($stmt->fetch(PDO::FETCH_OBJ)->id);
        } catch (Exception $e) {
            throw new Exception('Error getting current document', ERR_INTERNAL, $e);
        }
    }

    public function listByProject (string|stdClass $project):Generator {
        try {
            if (is_object($project)) {
                $project = intval($project->id);
            } else {
                $project = intval($project);
            }

            $stmt = $this->pdo->prepare(
                'SELECT id FROM accountingDoc 
                 WHERE deleted = 0 AND project = :project
                 ORDER BY id DESC'
            );
            $stmt->bindValue(':project', $project, PDO::PARAM_INT);
            $stmt->execute();
            while($row = $stmt->fetch(PDO::FETCH_OBJ)) {
                yield $this->get($row->id);
            }
        } catch (Exception $e) {
            throw new Exception('Error getting documents', ERR_INTERNAL, $e);
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

    private function doCreate (stdClass $document, bool $variant = false):stdClass {
        $this->pdo->beginTransaction();
        try {
            $related = null;
            if ($document->related) {
                $relDoc = $this->get($document->related);
                if (empty($relDoc)) {
                    throw new Exception('Related document not found', ERR_BAD_REQUEST);
                }
                $related = strval($relDoc->id);
            }
            $query = 'INSERT INTO accountingDoc 
                    (
                        id,
                        reference,
                        project,
                        name,
                        description,
                        date,
                        type,
                        created,
                        related,
                        variant
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
                        :related,
                        %s
                    )';
            
            if ($variant) {
                $query = sprintf($query, '(SELECT MAX(ac.variant) FROM accountingDoc AS ac WHERE ac.reference = :reference) + 1');
            } else {
                $query = sprintf($query, '0');
            }
            $stmt = $this->pdo->prepare($query);

            if ($document->project === null) {
                $stmt->bindValue(':project', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':project', $document->project, PDO::PARAM_INT);
            }

            if ($related === null) {
                $stmt->bindValue(':related', $related, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':related', $related, PDO::PARAM_INT);
            }
            $stmt->bindValue(':type', $document->type, PDO::PARAM_STR);
            $stmt->bindValue(':created', time(), PDO::PARAM_INT);
            $stmt->bindValue(':name', $document->name, PDO::PARAM_STR);
            $stmt->bindValue(':description', $document->description, PDO::PARAM_STR);
            $stmt->bindValue(':date', date('Y-m-d H:i'), PDO::PARAM_STR);

            $id = $this->get64();
            $stmt->bindValue(':id', intval($id), PDO::PARAM_INT);
            $format = '';
            switch ($document->type) {
                case 'offer': $format = 'O:yy:-:id04:'; break;
                case 'order': $format = 'C:yy:-:id04:'; break;
                case 'execution': $format = 'E:yy:-:id04:'; break;
            }
            if ($variant) {
                $stmt->bindValue(':reference', $document->reference, PDO::PARAM_STR);
            } else {
                $stmt->bindValue(':reference', $this->ref->get(sprintf('ACCOUNTINGDOC_%s_%s', date('Y') , $document->type), $format), PDO::PARAM_STR);
            }

            $stmt->execute();
            $this->pdo->commit();
            return $this->get($id);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error creating document', ERR_INTERNAL, $e);
        }
    }

    public function create (stdClass $document):stdClass {
        $document = self::normalizeIngressDocument($document);
        return $this->doCreate($document);
    }

    public function update (stdClass $document):stdClass {
        $document = self::normalizeIngressDocument($document);

        $originalDocument = $this->getRawDocument($document->id);
        if (empty($originalDocument)) {
            throw new Exception('Document not found', ERR_BAD_REQUEST);
        }
        $document = self::normalizeIngressDocument($document);
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
            $id = self::normalizeId($id);

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

    public function msword (string|int $id):string {

        $document = $this->get($id);
        $linesAPI = new AccountingDocLine($this->pdo, $this->cache);
        $lines = $linesAPI->search((object) ['docid' => $id]);
        
        $templateProcessor = new TemplateProcessor(__DIR__ . '/../../../resources/template.docx');
        
        $templateProcessor->setValue('reference-document', $document->reference);
        $templateProcessor->setValue('longue-date', date('d F Y'));

        $arr = [];
        foreach($lines as $line) {
            $arr[] = [
                'position' => $line->position,
                'position-soumission' => $line->posref,
                'designation' => $line->description,
                'quantité' => $line->quantity,
                'unité' => $line->unit,
                'prix-unitaire' => $line->price,
                'total' => $line->quantity * $line->price
            ];
        }
        $templateProcessor->cloneRow('position', count($arr));

        $templateProcessor->saveAs('/tmp/test.docx');
        return base64_encode(file_get_contents('/tmp/test.docx'));
    }

    public function pdf (string|int $id):string {
        $document = $this->get($id);
        $linesAPI = new AccountingDocLine($this->pdo, $this->cache);
        $lines = $linesAPI->search((object) ['docid' => $id]);
        $pdf = new kPDF();
        $pdf->SetAutoPageBreak(true, 10);
        $pdf->addTab(10);

        $pdf->SetCompression(false);
        $pdf->AddPage();
        $pdf->SetFont('Helvetica', '', 8);

        
        $pdf->echo('Document: ' . $document->reference);
        $pdf->break();

        $pdf->addColumn('Position', 10, 20);
        $pdf->addColumn('Description', 40, 100);
        $pdf->addColumn('Quantity', 160, 10);
        $pdf->addColumn('Price', 170, 10);
        $pdf->addColumn('Total', 180, 10);

        $parsedown = new Parsedown();
        $total = 0;
        foreach($lines as $line) {
            $baseY = $pdf->GetY();
            $maxY = $baseY;
            $pdf->setColumn('Position');
            $pdf->SetFont('Helvetica', '', 10);
            $pdf->echo($line->position);
            if ($pdf->GetY() > $maxY) {
                $maxY = $pdf->GetY();
            }

            $pdf->SetY($baseY);
            $pdf->setColumn('Description');
        
            $parsedown->pdf($pdf, $line->description);
            if ($pdf->GetY() > $maxY) {
                $maxY = $pdf->GetY();
            }
            $pdf->SetFont('Helvetica', '', 10);

            $pdf->SetY($baseY);
            $pdf->setColumn('Quantity');

            $pdf->echo(sprintf("%0.2f",$line->quantity));
            if ($pdf->GetY() > $maxY) {
                $maxY = $pdf->GetY();
            }

            $pdf->SetY($baseY);
            $pdf->setColumn('Price');

            $pdf->echo(sprintf("%0.2f",$line->price));
            if ($pdf->GetY() > $maxY) {
                $maxY = $pdf->GetY();
            }

            $pdf->setColumn('Total');
            $pdf->SetY($baseY);

            $total += ($line->price * $line->quantity);
            $pdf->echo(sprintf("%0.2f", $line->price * $line->quantity));
            if ($pdf->GetY() > $maxY) {
                $maxY = $pdf->GetY();
            }


            $pdf->resetColumn();
            $pdf->SetY($maxY);
            $pdf->hr();
        }
        $pdf->break();
        $pdf->resetColumn();

        $pdf->setFontSize(14);
        $pdf->echo('Total: ' . sprintf("%0.2f", $total));

        return base64_encode($pdf->Output('S'));
    }
}