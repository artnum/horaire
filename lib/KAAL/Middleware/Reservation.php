<?php
namespace KAAL\Middleware;

use Generator;
use KAAL\Middleware\Address\Contact;
use KaalDB\PDO\PDO;
use KAAL\Backend\{Cache, Storage};
use Exception;
use KAAL\Utils\MixedID;
use KAAL\Utils\PrefixedTable;
use stdClass;
use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};

class Reservation {
    use PrefixedTable;
    use MixedID;
    protected PDO $pdo;

    public function __construct(PDO $pdo, Cache $cache) {
        $this->pdo = $pdo;
        $this->pdo->beginTransaction();
    }

    public function __destruct() {
        if ($this->pdo->inTransaction()) {
            $this->pdo->commit();
        }
    }

    /**
     * Return the date range of the project based on a reservation ID
     * @param int|string $id 
     * @return stdClass 
     * @throws Exception 
     * 
     * @OperationType search
     */
    public function getProjectDateRange (int|string $id):stdClass
    {
        try {
            $stmt = $this->pdo->prepare(
                'SELECT MAX(r2.reservation_end) AS last, MIN(r2.reservation_begin) AS first
                FROM kairos.reservation r1
                JOIN travail t1 ON t1.travail_id = r1.reservation_affaire
                JOIN travail t2 ON t2.travail_project = t1.travail_project
                JOIN kairos.reservation r2 ON r2.reservation_affaire = t2.travail_id
                WHERE r1.reservation_id = :id;'
            );
            $stmt->execute([':id' => self::normalizeId($id)]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row === false) {
                throw new Exception('Invalid id');
            }
            return (object) $row;
        } catch (Exception $e) {
            throw new Exception('Project not found ' . $id, ERR_BAD_REQUEST, $e);
        }
    }
}