<?php

namespace KAAL\Utils;

use PDO;
use Exception;

/**
 * Merge a project into another new
 */
class MergeProject
{
    protected PDO $kaal;

    public function __construct(PDO $kaal)
    {
        $this->kaal = $kaal;
    }

    private function _execute_kaal(string $request, int $target, int $source)
    {
        $stmt = $this->kaal->prepare($request);
        if (!$stmt
            || !$stmt->bindValue(':target', $target, PDO::PARAM_INT)
            || !$stmt->bindValue(':source', $source, PDO::PARAM_INT)
            || !$stmt->execute()
        ) {
            throw new Exception('merge error');
        }
    }

    protected function mergeAccountingDoc(int $target, int $source)
    {
        $this->_execute_kaal(
            'UPDATE accountingDoc SET project = :target WHERE project = :source;',
            $target,
            $source
        );
    }

    protected function mergeTravail(int $target, int $source)
    {
        $this->_execute_kaal(
            'UPDATE travail SET travail_project = :target
            WHERE travail_project = :source;',
            $target,
            $source
        );
    }

    protected function mergeHtime(int $target, int $source)
    {
        $this->_execute_kaal(
            'UPDATE htime SET htime_project = :target
            WHERE htime_project = :source;',
            $target,
            $source
        );
    }

    protected function mergeRepartition(int $target, int $source)
    {
        $this->_execute_kaal(
            'UPDATE repartition SET repartition_project = :target
            WHERE repartition_project = :source',
            $target,
            $source
        );
    }

    protected function mergeQuantity(int $target, int $source)
    {
        $this->_execute_kaal(
            'UPDATE quantity SET quantity_project = :target
            WHERE quantity_project = :source',
            $target,
            $source
        );
    }

    protected function deleteSource(int $source)
    {
        $stmt = $this->kaal->prepare(
            'UPDATE project SET project_deleted = :time
            WHERE project_id = :source'
        );
        if (!$stmt
            || !$stmt->bindValue(':time', time(), PDO::PARAM_INT)
            || !$stmt->bindValue(':source', $source, PDO::PARAM_INT)
            || !$stmt->execute()
        ) {
            throw new Exception('Error deleting');
        }
    }

    public function merge(int $target, int $source)
    {
        try {
            if (!$this->kaal->beginTransaction()) {
                throw new Exception('Erreur');
            }
            $this->mergeAccountingDoc($target, $source);
            $this->mergeTravail($target, $source);
            $this->mergeHtime($target, $source);
            $this->mergeRepartition($target, $source);
            $this->mergeQuantity($target, $source);
            $this->deleteSource($source);

            $this->kaal->commit();
        } catch (Exception $e) {
            $this->kaal->rollBack();
            throw $e;
        }
    }
}
