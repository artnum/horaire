SET SQL_MODE=ANSI_QUOTES;

CREATE TABLE IF NOT EXISTS "category" (
	"category_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"category_name" TEXT DEFAULT NULL,
	"category_description" TEXT DEFAULT NULL,
	"category_created" INTEGER DEFAULT NULL,
	"category_deleted" INTEGER DEFAULT NULL,
	"category_modified" INTEGER DEFAULT NULL
);
CREATE TABLE IF NOT EXISTS "item" (
	"item_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"item_reference" TEXT DEFAULT NULL, -- reference useable by the company
	"item_name" TEXT DEFAULT NULL,
	"item_description" TEXT DEFAULT NULL,
	"item_unit" TEXT DEFAULT NULL,
	"item_price" FLOAT DEFAULT 0.0,
	"item_details" TEXT DEFAULT NULL, -- other details json formatted
	"item_category" INTEGER DEFAULT NULL,
	"item_created" INTEGER DEFAULT NULL,
	"item_deleted" INTEGER DEFAULT NULL,
	"item_modified" INTEGER DEFAULT NULL,
	FOREIGN KEY("item_category") REFERENCES "category"("category_id") ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "project" (
	"project_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"project_reference" TEXT DEFAULT NULL,
	"project_name" TEXT DEFAULT NULL,
	"project_closed" DATETIME DEFAULT NULL,
	"project_opened" DATETIME DEFAULT NULL,
	"project_targetEnd" DATETIME DEFAULT NULL,
	"project_deleted" INTEGER DEFAULT NULL,
	"project_created" INTEGER DEFAULT NULL,
	"project_modified" INTEGER DEFAULT NULL
, project_uncount integer default 0, "project_client" CHAR(160) DEFAULT NULL, project_price FLOAT DEFAULT 0.0, project_manager INTEGER DEFAULT NULL);
CREATE TABLE IF NOT EXISTS "process" (
	"process_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"process_name" TEXT DEFAULT NULL,
	"process_deleted" INTEGER DEFAULT NULL,
	"process_created" INTEGER DEFAULT NULL,
	"process_modified" INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "person" (
	"person_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"person_name" TEXT DEFAULT NULL,
	"person_username" TEXT NOT NULL UNIQUE,
	"person_level" INTEGER DEFAULT 1,
	"person_key" TEXT DEFAULT NULL,
	"person_keyopt" TEXT DEFAULT '{salt: "09F911029D74E35B", iteration: 1000}', -- json data containing iteration, salt and more if apply
	"person_deleted" INTEGER DEFAULT NULL,
	"person_created" INTEGER DEFAULT NULL,
	"person_modified" INTEGER DEFAULT NULL
, "person_disabled" INTEGER DEFAULT 0, "person_efficiency" FLOAT DEFAULT 1);
CREATE TABLE IF NOT EXISTS "travail" ( -- table containing specific work to be done
        "travail_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
        "travail_reference" VARCHAR(160) DEFAULT '',
        "travail_meeting" VARCHAR(160) DEFAULT '',
        "travail_contact" VARCHAR(160) DEFAULT '',
        "travail_phone" VARCHAR(160) DEFAULT '',
        "travail_description" TEXT DEFAULT '',
        "travail_project" INTEGER NOT NULL,
        "travail_created" INTEGER DEFAULT 0,
        "travail_modified" INTEGER DEFAULT 0, 
        "travail_progress" INTEGER DEFAULT 0, 
        "travail_closed" INTEGER DEFAULT 0, 
        "travail_time" FLOAT default 0, 
        "travail_force" FLOAT DEFAULT 1.0, 
        "travail_end" VARCHAR(10), 
		"travail_begin" VARCHAR(10) DEFAULT '', 
        "travail_plan" INTEGER DEFAULT 0, 
        "travail_group" CHAR(32),
        FOREIGN KEY("travail_project") REFERENCES "project"("project_id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "facture" (
       "facture_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
       "facture_reference" CHAR(64) NOT NULL DEFAULT '', -- peut être ligne de code bvr, numero de facture, ...
       "facture_currency" CHAR(3) NOT NULL DEFAULT 'chf', -- ISO 4217 code monétaire 3 lettre
       "facture_date" CHAR(32) NOT NULL, -- ISO 8601 date de la facture
       "facture_duedate" CHAR(32) NOT NULL, -- ISO 8601 date de paiement
       "facture_indate" CHAR(32) NOT NULL, -- ISO 8601 date d'entrée de la facture
       "facture_amount" FLOAT DEFAULT 0.0, -- montant de la facture
       "facture_type" INTEGER DEFAULT 1, -- 0 pas utilisé, 1 facture débiteur, 2 facture créancier, 3 note de crédit, 4 compensation
       "facture_qrdata" TEXT(997) DEFAULT '', -- facture qr code sont à 997 caractères max
       "facture_person" TEXT NOT NULL, -- personne (physique ou morale) sur qui porte la facture
       "facture_comment" CHAR(200) DEFAULT '', -- commentaire sur la facture
       "facture_deleted" INT DEFAULT 0 -- facture supprimée
);
CREATE TABLE IF NOT EXISTS "rappel" (
       "rappel_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
       "rappel_facture" INTEGER NOT NULL,
       "rappel_date" CHAR(32) NOT NULL, -- ISO 8601
       "rappel_type" INTEGER DEFAULT 1, -- 0 pas utilisé, 1 rappel, 2 sommation, 3 poursuites
       "rappel_delay" INTEGER DEFAULT 0, -- 0 pas de délai sinon nombre de jours
       "rappel_frais" FLOAT DEFAULT 0.0, -- montant des frais
       "rappel_cc" INTEGER DEFAULT 0, -- Société de recouvement ? 0 non, 1 oui
       "rappel_qrdata" TEXT(997) DEFAULT '', -- facture qr code sont à 997 caractères max
       FOREIGN KEY("rappel_facture") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "paiement" ( -- paiement effectué pour une facture
	"paiement_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"paiement_facture" INTEGER NOT NULL,
	"paiement_date" CHAR(32) NOT NULL, -- ISO 8601
	"paiement_amount" FLOAT DEFAULT 0.0, -- montant versé
	FOREIGN KEY("paiement_facture") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "factureLien" ( 
	"factureLien_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"factureLien_source" INTEGER NOT NULL, -- facture source
	"factureLien_destination" INTEGER NOT NULL, -- facture de destination
	"factureLien_type" INTEGER DEFAULT 1, -- 0 pas utilisé, 1 relation générique, 2 rappel, 3 sommation, 4 poursuite
	"factureLien_comment" CHAR(200) DEFAULT '', -- commentaire sur le lien
	FOREIGN KEY ("factureLien_source") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY ("factureLien_destination") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "repartition" ( -- repartition d'une facture sur un projet
       "repartition_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
       "repartition_facture" INTEGER NOT NULL, -- Facture à répartir
       "repartition_project" INTEGER NOT NULL, -- Projet sur lequel répartir
       "repartition_travail" INTEGER DEFAULT NULL, -- Travail sur lequel répartir
       "repartition_value" FLOAT DEFAULT NULL, -- Valeur répartie hors TVA
       "repartition_tva" FLOAT DEFAULT 7.7, -- valeur de la TVA par défaut 7.7%
       FOREIGN KEY("repartition_facture") REFERENCES "facture"("facture_id") ON UPDATE CASCADE ON DELETE CASCADE,
       FOREIGN KEY("repartition_project") REFERENCES "project"("project_id") ON UPDATE CASCADE ON DELETE CASCADE,
       FOREIGN KEY("repartition_travail") REFERENCES "travail"("travail_id") ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "prixheure" (
    "prixheure_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
    "prixheure_person" INTEGER NOT NULL,
    "prixheure_value" FLOAT DEFAULT 0.0, -- prix de l'heure
    "prixheure_validity" CHAR(32) NOT NULL, -- premier jour de validité
    FOREIGN KEY ("prixheure_person") REFERENCES "person"("person_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "tseg" (
       "tseg_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
       "tseg_date" CHAR(10) NOT NULL DEFAULT '',
       "tseg_travail" INTEGER NOT NULL,
       "tseg_time" INTEGER NOT NULL,
       "tseg_person" INTEGER NOT NULL,
       "tseg_efficiency" FLOAT NOT NULL DEFAULT 1.0,
       "tseg_color" CHAR(40) NOT NULL DEFAULT 'hsla(45, 100%, 50%, 1)',
       "tseg_details" CHAR(200) DEFAULT '',
       FOREIGN KEY ("tseg_travail") REFERENCES "travail"("travail_id") ON UPDATE CASCADE ON DELETE CASCADE,
       FOREIGN KEY ("tseg_person") REFERENCES "person"("person_id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "quantity" (
	"quantity_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"quantity_value" FLOAT DEFAULT 1.0,
	"quantity_item" INTEGER DEFAULT NULL,
	"quantity_project" INTEGER DEFAULT NULL,
	"quantity_process" INTEGER DEFAULT NULL,
	"quantity_person" INTEGER DEFAULT NULL,
	FOREIGN KEY("quantity_item") REFERENCES "item"("item_id") ON UPDATE CASCADE ON DELETE SET NULL,
	FOREIGN KEY("quantity_project") REFERENCES "project"("project_id") ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY("quantity_process") REFERENCES "process"("process_id") ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY("quantity_person") REFERENCES "person"("person_id") ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "htime" (
	"htime_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"htime_day" DATETIME DEFAULT NULL,
	"htime_value" INTEGER DEFAULT 0,
	"htime_project" INTEGER DEFAULT NULL,
	"htime_person" INTEGER DEFAULT NULL,
	"htime_process" INTEGER DEFAULT NULL,
	"htime_comment" TEXT DEFAULT NULL,
	"htime_other" TEXT DEFAULT NULL,  -- json data to handle useful information (like a date range if that apply)
	"htime_created" INTEGER DEFAULT NULL,
	"htime_deleted" INTEGER DEFAULT NULL,
	"htime_modified" INTEGER DEFAULT NULL, htime_travail INTEGER DEFAULT NULL,
	FOREIGN KEY("htime_person") REFERENCES "person"("person_id") ON UPDATE CASCADE ON DELETE SET NULL,
	FOREIGN KEY("htime_project") REFERENCES "project"("project_id") ON UPDATE CASCADE ON DELETE SET NULL,
	FOREIGN KEY("htime_process") REFERENCES "process"("process_id") ON UPDATE CASCADE ON DELETE SET NULL
);