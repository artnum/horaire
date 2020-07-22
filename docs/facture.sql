-- Une facture est soit émise (type = 2) soit reçue (type = 1).
-- Un rappel, une sommation, ..., est une nouvelle facture en lien avec une précédente
-- Un note de crédit ou une compensation est liée à une facture débiteur ou créancier
CREATE TABLE IF NOT EXISTS "facture" (
       "facture_id" INTEGER PRIMARY KEY AUTOINCREMENT,
       "facture_reference" CHAR(64) NOT NULL DEFAULT '', -- peut être ligne de code bvr, numero de facture, ...
       "facture_currency" CHAR(3) NOT NULL DEFAULT 'chf', -- ISO 4217 code monétaire 3 lettre
       "facture_date" CHAR(32) NOT NULL, -- ISO 8601 date de la facture
       "facture_duedate" CHAR(32) NOT NULL, -- ISO 8601 date de paiement
       "facture_indate" CHAR(32) NOT NULL, -- ISO 8601 date d'entrée de la facture
       "facture_amount" FLOAT DEFAULT 0.0, -- montant de la facture
       "facture_type" INTEGER DEFAULT 1, -- 0 pas utilisé, 1 facture débiteur, 2 facture créancier, 3 note de crédit, 4 compensation
       "facture_qrdata" CHAR(997) DEFAULT '', -- facture qr code sont à 997 caractères max
       "facture_person" TEXT NOT NULL, -- personne (physique ou morale) sur qui porte la facture
       "facture_comment" CHAR(200) DEFAULT '', -- commentaire sur la facture
       "facture_deleted" INT DEFAULT 0 -- facture supprimée
);

-- permet de lier des factures entre elles. utile pour lier une note de crédit à des factures
-- ou toutes autres sortes de liens (remplace rappel)
CREATE TABLE IF NOT EXISTS "factureLien" ( 
	"factureLien_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"factureLien_source" INTEGER NOT NULL, -- facture source
	"factureLien_destination" INTEGER NOT NULL, -- facture de destination
	"factureLien_type" INTEGER DEFAULT 1, -- 0 pas utilisé, 1 relation générique, 2 rappel, 3 sommation, 4 poursuite
	"factureLien_comment" CHAR(200) DEFAULT '', -- commentaire sur le lien
	FOREIGN KEY ("factureLien_source") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY ("factureLien_destination") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE
);

--CREATE TABLE IF NOT EXISTS "rappel" (
--       "rappel_id" INTEGER PRIMARY KEY AUTOINCREMENT,
--       "rappel_facture" INTEGER NOT NULL,
--       "rappel_date" CHAR(32) NOT NULL, -- ISO 8601
--       "rappel_type" INTEGER DEFAULT 1, -- 0 pas utilisé, 1 rappel, 2 sommation, 3 poursuites
--       "rappel_delay" INTEGER DEFAULT 0, -- 0 pas de délai sinon nombre de jours
--       "rappel_frais" FLOAT DEFAULT 0.0, -- montant des frais
--       "rappel_cc" INTEGER DEFAULT 0, -- Société de recouvement ? 0 non, 1 oui
--       "rappel_qrdata" CHAR(997) DEFAULT '', -- facture qr code sont à 997 caractères max
--       FOREIGN KEY("rappel_facture") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE
--);

CREATE TABLE IF NOT EXISTS "repartition" ( -- repartition d'une facture sur un projet
       "repartition_id" INTEGER PRIMARY KEY AUTOINCREMENT,
       "repartition_facture" INTEGER NOT NULL, -- Facture à répartir
       "repartition_project" INTEGER NOT NULL, -- Projet sur lequel répartir
       "repartition_travail" INTEGER DEFAULT NULL, -- Travail sur lequel répartir
       "repartition_value" FLOAT DEFAULT NULL, -- Valeur répartie hors TVA
       "repartition_tva" FLOAT DEFAULT 7.7, -- valeur de la TVA par défaut 7.7%
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
