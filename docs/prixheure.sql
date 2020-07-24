-- Tarification horaire par personne.
CREATE TABLE IF NOT EXISTS "prixheure" (
    "prixheure_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "prixheure_person" INTEGER NOT NULL,
    "prixheure_value" FLOAT DEFAULT 0.0, -- prix de l'heure
    "prixheure_validity" CHAR(32) NOT NULL, -- premier jour de validité
    FOREIGN KEY ("prixheure_person") REFERENCES "person"("person_id") ON DELETE CASCADE ON UPDATE CASCADE
);