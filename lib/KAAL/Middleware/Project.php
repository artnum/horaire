<?php
namespace KAAL\Middleware;

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

    public function get (int|string $id):stdClass {
        try {
            $stmt = $this->pdo->prepare('SELECT * FROM project WHERE project_id = :id');
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