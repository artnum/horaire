<?php

namespace KAAL\Middleware;

use Exception;
use KAAL\Utils\MixedID;
use MonoRef\Backend\IStorage;
use PDO;
use Snowflake53\ID;
use stdClass;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};

class Documents
{
    use ID;
    use MixedID;
    public const MAX_TYPE_LENGTH = 20;
    protected PDO $pdo;
    protected IStorage|null $cache;

    public function __construct(PDO $pdo, IStorage|null $cache = null)
    {
        $this->pdo = $pdo;
        if ($cache !== null) {
            $this->cache = $cache;
        }
    }
    protected static function normalizeEgressDocument(stdClass $document): stdClass
    {
        switch ($document->type) {
            case 'offer': $format = 'O:yy:-:id04:';
                break;
            case 'order': $format = 'C:yy:-:id04:';
                break;
            case 'execution': $format = 'E:yy:-:id04:';
                break;
        }
        return $document;
    }

    protected static function normalizeIngressDocument(stdClass $document): stdClass
    {
        if (empty($document)) {
            throw new Exception('No document provided', ERR_BAD_REQUEST);
        }
        $document->type = strtolower(strval($document->type));
        switch ($document->type) {
            case 'offer':
            case 'order':
            case 'execution':
            case 'project':
            case 'facture':
                break;
            default:
                throw new Exception('Invalid document type', ERR_BAD_REQUEST);
        }

        return $document;
    }

    public function get(string|int $id): stdClass
    {
        try {
            $id = self::normalizeId($id);
            $stmt = $this->pdo->prepare('
                SELECT id,type,year,reference,variant
                FROM documents WHERE id = :id
            ');
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            return self::normalizeEgressDocument($stmt->fetch(PDO::FETCH_OBJ));
        } catch (Exception $e) {
            throw new Exception('Error getting document', ERR_INTERNAL, $e);
        }
    }

    public function create(stdClass $document): int
    {
        try {
            $document = self::normalizeIngressDocument($document);
            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare('
                INSERT INTO documents
                    (id, type, year, created)
                VALUES
                    (:id, :type, YEAR(CURRENT_DATE()), UNIX_TIMESTAMP())
            ');
            $id = self::get63();
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':type', $document->type, PDO::PARAM_STR);
            $stmt->execute();
            $this->pdo->commit();
            return $id;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw new Exception('Error creating document', ERR_INTERNAL, $e);
        }
    }

}

