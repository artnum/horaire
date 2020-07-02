-- Une facture est soit émise (facture_debt = 2) soit reçue (facture_debt = 1).
-- Se faisant un rappel associé est soit émis soit reçu en fonction de cette valeur
CREATE TABLE IF NOT EXISTS "facture" (
       "facture_id" INTEGER PRIMARY KEY AUTOINCREMENT,
       "facture_reference" CHAR(64) NOT NULL DEFAULT '', -- peut être ligne de code bvr, numero de facture, ...
       "facture_date" CHAR(32) NOT NULL, -- ISO 8601 date de la facture
       "facture_duedate" CHAR(32) NOT NULL, -- ISO 8601 date de paiement
       "facture_category" INTEGER DEFAULT NULL, -- reference à une catégorie
       "facture_amount" FLOAT DEFAULT 0.0, -- montant de la facture
       "facture_type" INTEGER DEFAULT 1, -- 0 pas utilisé, 1 facture, 2 note de crédit
       "facture_qrdata" CHAR(997) DEFAULT '', -- facture qr code sont à 997 caractères max
       "facture_person" TEXT NOT NULL, -- personne (physique ou morale) sur qui porte la facture
       "facture_debt" INTEGER DEFAULT 1, -- 0 pas utilisé, 1 dette, 2 créance
       "facture_comment" CHAR(200) DEFAULT '', -- commentaire sur la facture
       FOREIGN KEY ("facture_category") REFERENCES "category"("category_id") ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "rappel" (
       "rappel_id" INTEGER PRIMARY KEY AUTOINCREMENT,
       "rappel_facture" INTEGER NOT NULL,
       "rappel_date" CHAR(32) NOT NULL, -- ISO 8601
       "rappel_type" INTEGER DEFAULT 1, -- 0 pas utilisé, 1 rappel, 2 sommation, 3 poursuites
       "rappel_delay" INTEGER DEFAULT 0, -- 0 pas de délai sinon nombre de jours
       "rappel_frais" FLOAT DEFAULT 0.0, -- montant des frais
       "rappel_cc" INTEGER DEFAULT 0, -- Société de recouvement ? 0 non, 1 oui
       "rappel_qrdata" CHAR(997) DEFAULT '', -- facture qr code sont à 997 caractères max
       FOREIGN KEY("rappel_facture") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "repartition" ( -- repartition d'une facture sur un projet
       "repartition_id" INTEGER PRIMARY KEY AUTOINCREMENT,
       "repartition_facture" INTEGER NOT NULL, -- Facture à répartir
       "repartition_project" INTEGER NOT NULL, -- Projet sur lequel répartir
       "repartition_travail" INTEGER DEFAULT NULL, -- Travail sur lequel répartir
       "repartition_value" FLOAT DEFAULT NULL, -- Valeur de la facture, NULL étant la valeur restante
       FOREIGN KEY("repartition_facture") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE,
       FOREIGN KEY("repartition_project") REFERENCES "project"("project_id") ON UPDATE CASCADE ON DELETE CASCADE,
       FOREIGN KEY("repartition_travail") REFERENCES "travail"("travail_id") ON UPDATE CASCADE ON DELETE SET NULL
);

-- Une facture peut recevoir plusieurs paiements
CREATE TABLE IF NOT EXISTS "paiement" ( -- paiement effectué pour une facture
	"paiement_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"paiement_facture" INTEGER NOT NULL,
	"paiement_date" CHAR(32) NOT NULL, -- ISO 8601
	"paiement_amount" FLOAT DEFAULT 0.0, -- montant versé
	FOREIGN KEY("paiement_facture") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE
);
