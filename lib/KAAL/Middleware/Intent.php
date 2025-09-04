<?php

namespace KAAL\Middleware;

use KaalDB\PDO\PDO;
use KAAL\Backend\{Cache, Storage};
use MonoRef\Backend\IStorage;
use KAAL\Utils\Reference;
use stdClass;
use Normalizer;

class Intent {
    protected PDO $pdo;
    protected IStorage|null $cache;
    protected Reference|null $ref;

    function normalizeIngressDocument (stdClass $intent): stdClass {
        $intent->name = trim(Normalizer::normalize($intent->name));
        $intent->description = trim(Normalizer::normalize($intent->description));
        return $intent;
    }

    public function __construct(PDO $pdo, IStorage|null $cache = null) {
        $this->pdo = $pdo;
        if ($cache !== null) {
            $this->ref = new Reference($cache);
            $this->cache = $cache;
        }
    }

    function create (stdClass $intent): stdClass {
        $intent->reference = $this->ref->get(sprintf('INTENT_OBJECT_NUMBER_%s', date('Y')), 'OBJ-:YY-:id04');
        $stmt = $this->pdo->prepare("INSERT INTO intents (reference, created) VALUES (:reference, :created)");
        $stmt->bindValue(':reference', $intent->reference, PDO::PARAM_STR);
        $stmt->bindValue(':created', time(), PDO::PARAM_INT);
        $stmt->execute();

        return $intent;
    }

    function update (stdClass $intent): stdClass {
        $stmt = $this->pdo->prepare("UPDATE intents SET name = :name, description = :description WHERE reference = :reference");
        $stmt->bindValue(':name', $intent->name, PDO::PARAM_STR);
        $stmt->bindValue(':description', $intent->description, PDO::PARAM_STR);
        $stmt->bindValue(':reference', $intent->reference, PDO::PARAM_STR);
        $stmt->execute();

        return $intent;
    }
}