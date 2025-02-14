<?php
namespace KAAL\Middleware;

use artnum\JStore\Generic;
use Generator;
use KAAL\Middleware\Address\Contact;
use KaalDB\PDO\PDO;
use KAAL\Backend\{Cache, Storage};
use Exception;
use stdClass;
use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};

class Project {
    protected PDO $pdo;
    protected Contact $contact;

    public function __construct(PDO $pdo, Cache $cache, Contact $contact) {
        $this->pdo = $pdo;
        $this->pdo->beginTransaction();
        $this->contact = $contact;
    }

    public function __destruct() {
        if ($this->pdo->inTransaction()) {
            $this->pdo->commit();
        }
    }

    private function unprefix (array $line) {
        return array_combine(
            array_map(
                function($k) { $x = explode('_', $k, 2); return array_pop($x); },
                array_keys($line)
            ),
            $line
        );
    }

    public function list(int $offset = 0, int $size = 100):Generator {
        return $this->_list($offset, $size);
    }
    public function listDeleted(int $offset = 0, int $size = 100):Generator {
        return $this->list($offset, $size, true);
    }

    private function _list(
        int $offset = 0,
        int $size = 100,
        bool $deleted = false
    ):Generator
    {
        try {
            $stmt = $this->pdo->query(sprintf('
                SELECT project_id, project_reference, project_name
                FROM project WHERE IFNULL(project_deleted, 0) %s 0
                ORDER BY project_id DESC
                LIMIT %d,%d
            ', $deleted ? '<>' : '=', $offset, $size + 1));

            while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                if ($size-- <= 0) { 
                    yield (object) ['__more' => true];
                    break; 
                }
        
                yield (object) $this->unprefix($row);
            }
        } catch (Exception $e) {
            throw new Exception('Project listing failed', ERR_INTERNAL, $e);
        }
    }

    /**
     * 
     * @param int|string $id 
     * @return stdClass 
     * @throws Exception 
     * 
     * @OperationType(read)
     */
    public function get (int|string $id):stdClass {
        try {
            $stmt = $this->pdo->prepare(
                'SELECT project_id, project_reference, project_name,
                    project_closed, project_opened, project_targetEnd,
                    project_client, project_price, project_manager, 
                    project_extid, project_ordering, project_process
                FROM project WHERE project_id = :id
            ');
            $stmt->execute([':id' => $id]);
            $project = (object) $this->unprefix($stmt->fetch(PDO::FETCH_ASSOC));
            try {
                $project->client = $this->contact->get($project->client);
            } catch (Exception $e) {
                $project->client = null;
            }
            return $project;
        } catch(Exception $e) {
            throw new Exception('Project not found ' . $id, ERR_BAD_REQUEST, $e);
        }
    }
}