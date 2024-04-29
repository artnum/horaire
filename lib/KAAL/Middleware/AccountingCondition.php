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
use KAAL\Utils\MixedID;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};


class AccountingCondition {
    private PDO $pdo;

    use ID;
    use MixedID;

    function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->pdo->beginTransaction();
    }

    function __destruct() {
        if ($this->pdo->inTransaction()) {
            $this->pdo->commit();
        }
    }

    protected function normalizeIngress (stdClass $condition) {
        $cond = new stdClass();
        $cond->docid = self::normalizeId($condition->docid);
        $cond->content = new stdClass();
        foreach($condition->content as $key => $value) {
            if (!is_numeric($value)) {
                throw new Exception('Invalid value', ERR_BAD_REQUEST, 
                    new Exception('Value must be numeric.'));
            }
            $cond->content->{strtoupper($key)} = floatval($value);
        }

        if (!isset($cond->content->RPLP)) {
            $cond->content->RPLP = 2.2;
        }
        if (!isset($cond->content->ROUNDING)) {
            $cond->content->ROUNDING = 0.05;
        }
        if (!isset($cond->content->TAX)) {
            $cond->content->TAX = 8.1;
        }
        return $cond;
    }

    protected function normalizeEgress (stdClass $condition) {
        $cond = new stdClass();
        $cond->docid = strval($condition->docid);
        $cond->content = new stdClass();
        foreach($condition->content as $key => $value) {
            if (!is_numeric($value)) {
                throw new Exception('Invalid value', ERR_BAD_REQUEST, 
                    new Exception('Value must be numeric.'));
            }
            $cond->content->{strtoupper($key)} = floatval($value);
        }
        return $cond;
    }

    function lookup (stdClass|int|string $docId) {
        $docId = self::normalizeId($docId);
        $hasCondition = $this->get($docId);
        if (count((array)$hasCondition) > 0) {
            return $hasCondition;
        }

        $accountingDocAPI = new AccountingDoc($this->pdo);
        $tree = $accountingDocAPI->tree($docId);
        $list = array_merge($tree->parents, $tree->childs);
        if (count($list) == 0) {
            return new stdClass();
        }
        
        $stmt = $this->pdo->prepare('SELECT docid FROM accountingDocConditionValues WHERE docid IN (' . implode(',', $list) . ') GROUP BY docid ORDER BY docid DESC LIMIT 1');
        $stmt->execute();
        $row = $stmt->fetch();
        if ($row === false) {
            return new stdClass();
        }
        return $this->get($row['docid']);
    }

    function create (stdClass|int|string $condition): stdClass {
        $condition = $this->normalizeIngress($condition);
        $stmt = $this->pdo->prepare('DELETE FROM accountingDocConditionValues WHERE docid = :docid');
        $stmt->bindValue(':docid', $condition->docid);
        $stmt->execute();
        $stmt = $this->pdo->prepare('INSERT INTO accountingDocConditionValues (docid, name, value, type)
            VALUES (:docid, :name, :value,  "absolute")');
        $stmt->bindValue(':docid', $condition->docid);
        foreach($condition->content as $key => $value) {
            $stmt->bindValue(':name', $key);
            $stmt->bindValue(':value', $value);
            $stmt->execute();
        }
        return $this->normalizeEgress($condition);
    }

    function get (stdClass|int|string $condition): stdClass {
        if (!is_object($condition)) {
            $docid = $condition;
            $condition = new stdClass();
            $condition->docid = $docid;
        }
    
        $condition = $this->normalizeIngress($condition);
        $stmt = $this->pdo->prepare('SELECT name, value FROM accountingDocConditionValues WHERE docid = :docid');
        $stmt->bindValue(':docid', $condition->docid);
        $stmt->execute();
        if ($stmt->rowCount() == 0) {
            return new stdClass();
        }
        $result = new stdClass();
        $result->docid = $condition->docid;
        $result->content = new stdClass();
        while ($row = $stmt->fetch()) {
            $result->content->{$row['name']} = $row['value'];
        }
        return $this->normalizeEgress($result);
    }
}
