<?php

namespace KAAL\Middleware;

use Generator;
use KAAL\Middleware\Address\Contact;
use KaalDB\PDO\PDO;
use KAAL\Backend\{Cache, Storage};
use Exception;
use KAAL\Context;
use KAAL\Utils\PrefixedTable;
use stdClass;

use const PJAPI\{ERR_BAD_REQUEST, ERR_INTERNAL};

class Project
{
    use PrefixedTable;

    public function __construct(private Context $context, private Contact $contact)
    {
    }

    /**
     * List projects
     *
     * @param $offset Offset
     * @param $size   Size
     *
     * @return Generator
     * @throws Exception
     */
    public function list(int $offset = 0, int $size = 100): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        return $this->_list($offset, $size);
    }

    /**
     * List deleted project
     *
     * @param $offset Offset
     * @param $size   Size
     *
     * @return Generator
     * @throws Exception
     */
    public function listDeleted(int $offset = 0, int $size = 100): Generator
    {
        $this->context->rbac()->can(
            $this->context->auth(),
            get_class($this),
            __FUNCTION__
        );
        return $this->list($offset, $size, true);
    }

    private function _list(
        int $offset = 0,
        int $size = 100,
        bool $deleted = false
    ): Generator {
        try {
            $stmt = $this->context->pdo()->query(sprintf('
                SELECT project_id, project_reference, project_name
                FROM project WHERE IFNULL(project_deleted, 0) %s 0
                ORDER BY project_id DESC
                LIMIT %d,%d
            ', $deleted ? '<>' : '=', $offset, $size + 1));

            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
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
     * Get a project
     *
     * @param $id Project ID
     *
     * @return stdClass
     * @throws Exception
     */
    public function get(int|string $id): stdClass
    {
        try {
            $this->context->rbac()->can(
                $this->context->auth(),
                get_class($this),
                __FUNCTION__
            );
            $stmt = $this->context->pdo()->prepare(
                'SELECT project_id, project_reference, project_name,
                    project_closed, project_opened, project_targetEnd,
                    project_client, project_price, project_manager, 
                    project_extid, project_ordering, project_process
                FROM project WHERE project_id = :id
            '
            );
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row === false) {
                throw new Exception('Invalid id');
            }
            $project = (object) $this->unprefix($row);
            try {
                $project->client = $this->contact->get($project->client);
            } catch (Exception $e) {
                $project->client = null;
            }
            return $project;
        } catch (Exception $e) {
            throw new Exception('Project not found ' . $id, ERR_BAD_REQUEST, $e);
        }
    }
}

