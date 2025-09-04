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
	"project_modified" INTEGER DEFAULT NULL, 
	"project_uncount" integer default 0,
	"project_client" CHAR(160) DEFAULT NULL, 
	"project_price" FLOAT DEFAULT 0.0,
	"project_manager" INTEGER DEFAULT NULL,
    "project_ordering" INTEGER UNSIGNED NOT NULL DEFAULT 2);

CREATE TABLE IF NOT EXISTS "person" (
	"person_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"person_name" TEXT DEFAULT NULL,
	"person_username" TEXT NOT NULL UNIQUE,
	"person_level" INTEGER DEFAULT 1,
	"person_key" TEXT DEFAULT '',
	"person_keyopt" TEXT DEFAULT '',
	"person_order" INT DEFAULT 0,
	"person_workday"  CHAR(7) DEFAULT 'nyyyyyn',
	"person_extid" INT UNSIGNED DEFAULT NULL,    
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
		"travail_status" INT UNSIGNED DEFAULT NULL,
		"travail_urlgps" VARCHAR(200) DEFAULT '',
		"travail_folder" TINYINT UNSIGNED NOT NULL DEFAULT 0,
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
	   "repartition_split" TINYINT DEFAULT 0, -- valuer global divisée pour chaque projet
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

CREATE TABLE IF NOT EXISTS "quantity" (
	"quantity_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"quantity_value" FLOAT DEFAULT 1.0,
	"quantity_item" INTEGER DEFAULT NULL,
	"quantity_project" INTEGER DEFAULT NULL,
	"quantity_process" INTEGER UNSIGNED DEFAULT NULL,
	"quantity_person" INTEGER DEFAULT NULL,
	FOREIGN KEY("quantity_item") REFERENCES "item"("item_id") ON UPDATE CASCADE ON DELETE SET NULL,
	FOREIGN KEY("quantity_project") REFERENCES "project"("project_id") ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY("quantity_person") REFERENCES "person"("person_id") ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE INDEX "idxQuantity_process" ON "quantity"("quantity_process") USING HASH;


CREATE TABLE IF NOT EXISTS "htime" (
	"htime_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"htime_day" DATETIME DEFAULT NULL,
	"htime_value" INTEGER DEFAULT 0,
	"htime_project" INTEGER DEFAULT NULL,
	"htime_person" INTEGER DEFAULT NULL,
	"htime_process" INTEGER UNSIGNED DEFAULT NULL,
	"htime_comment" TEXT DEFAULT NULL,
	"htime_other" TEXT DEFAULT NULL,  -- json data to handle useful information (like a date range if that apply)
	"htime_created" INTEGER DEFAULT NULL,
	"htime_deleted" INTEGER DEFAULT NULL,
	"htime_modified" INTEGER DEFAULT NULL,
	"htime_travail" INTEGER DEFAULT NULL,
	"htime_dinner" INTEGER UNSIGNED NOT NULL DEFAULT 0,
	"htime_km" INTEGER UNSIGNED NOT NULL DEFAULT 0,
	FOREIGN KEY("htime_person") REFERENCES "person"("person_id") ON UPDATE CASCADE ON DELETE SET NULL,
	FOREIGN KEY("htime_project") REFERENCES "project"("project_id") ON UPDATE CASCADE ON DELETE SET NULL,
);
CREATE INDEX "idxHtime_process" ON "htime"("htime_process") USING HASH;


CREATE TABLE IF NOT EXISTS "kaalauth" (
	"uid" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"userid" INTEGER UNSIGNED NOT NULL,
	"time" INTEGER UNSIGNED DEFAULT 0,
	"started" INTEGER UNSIGNED DEFAULT 0,
	"confirmed" INTEGER(1) UNSIGNED DEFAULT 0,
	"auth" CHAR(255) DEFAULT '',
	"remotehost" VARCHAR(256) DEFAULT '',
	"remoteip" VARCHAR(40) DEFAULT '',
	"useragent" VARCHAR(100) DEFAULT '',
	"share" INT(1) UNSIGNED DEFAULT 0,
	"urlid" CHAR(40) DEFAULT '',
	"url" TEXT DEFAULT '',
	"comment" CHAR(140) DEFAULT '',
	"duration" INTEGER UNSIGNED DEFAULT 0
);
CREATE INDEX "idxKaalAuth_auth" ON "kaalauth"("auth") USING HASH;

CREATE TABLE IF NOT EXISTS "personlink" (
	"personlink_uid" INTEGER UNSIGNED,
	"personlink_extid" CHAR(20) NOT NULL,
	"personlink_service" CHAR(20) NOT NULL,
	PRIMARY KEY("personlink_uid", "personlink_service")
);
CREATE INDEX "idxPersonLink_service" ON "personlink"("personlink_service") USING HASH;

CREATE TABLE IF NOT EXISTS "group" (
	"group_uid" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"group_name" CHAR(20) NOT NULL UNIQUE,
	"group_description" VARCHAR(260) DEFAULT '',
	"group_deleted" INTEGER UNSIGNED DEFAULT NULL
);
CREATE INDEX "idxGroup_name" ON "group"("group_name") USING HASH;

CREATE TABLE IF NOT EXISTS "groupuser" (
	"groupuser_uid" INTEGER UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	"groupuser_user" INTEGER UNSIGNED NOT NULL,
	"groupuser_group" INTEGER UNSIGNED NOT NULL
);
CREATE UNIQUE INDEX "idxGroupUser_user_group" ON "groupuser"("groupuser_user", "groupuser_group") USING HASH;

CREATE TABLE IF NOT EXISTS "carusage" (
	"carusage_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"carusage_car" INTEGER UNSIGNED NOT NULL,
	"carusage_km" INTEGER UNSIGNED NOT NULL,
	"carusage_defect" INTEGER UNSIGNED DEFAULT NULL,
	"carusage_comment" VARCHAR(300) DEFAULT '',
	"carusage_htime" INTEGER UNSIGNED NOT NULL
);

CREATE TABLE IF NOT EXISTS "contact_bridges" (
	"id" BIGINT UNSIGNED PRIMARY KEY,
	"name" VARCHAR(100) DEFAULT '',
	"source" VARCHAR(50),
	"original_id" VARCHAR(100),
	UNIQUE("source", "original_id")
);
CREATE INDEX "idxContacts_name" ON "contact_bridges"("name") USING BTREE;
CREATE INDEX "idxContacts_originalId" ON "contact_bridges"("original_id") USING HASH;

CREATE TABLE IF NOT EXISTS "contact_types" (
	"id" BIGINT UNSIGNED PRIMARY KEY,
	"name" VARCHAR (100) DEFAULT '',
	"priority" INT DEFAULT 10
);

CREATE TABLE IF NOT EXISTS "documents_contacts" (
	"contact_id" BIGINT UNSIGNED,
	"document_id" BIGINT UNSIGNED,
	"type_id" BIGINT UNSIGNED,

	PRIMARY KEY ("contact_id", "document_id", "type_id"),
	FOREIGN KEY ("contact_id") REFERENCES "contact_bridges"("id"),
	FOREIGN KEY ("document_id") REFERENCES "documents"("id"),
	FOREIGN KEY ("type_id") REFERENCES "contact_types"("id")
);
CREATE INDEX "idxDocumentsContacts_type" ON "documents_contacts"("type") USING HASH;

CREATE TABLE IF NOT EXISTS "documents" (
	"id" BIGINT UNSIGNED PRIMARY KEY,
	"type" VARCHAR(20),
	"year" SMALLINT UNSIGNED default (YEAR(CURRENT_DATE())),
	"created" BIGINT UNSIGNED default 0,
	"deleted" BIGINT UNSIGNED default 0
);
CREATE INDEX "idxDocuments_deleted" on "documents"("deleted");

ALTER TABLE "project" ADD COLUMN "document_id" BIGINT UNSIGNED;
ALTER TABLE "project" ADD FOREIGN KEY ("document_id") REFERENCES "documents"("id");
ALTER TABLE "project" ADD UNIQUE ("document_id");
ALTER TABLE "facture" ADD COLUMN "document_id" BIGINT UNSIGNED;
ALTER TABLE "facture" ADD FOREIGN KEY ("document_id") REFERENCES "documents"("id");
ALTER TABLE "facture" ADD UNIQUE ("document_id");
ALTER TABLE "accountingDoc" ADD COLUMN "document_id" BIGINT UNSIGNED;
ALTER TABLE "accountingDoc" ADD FOREIGN KEY ("document_id") REFERENCES "documents"("id");
ALTER TABLE "accountingDoc" ADD UNIQUE ("document_id");


CREATE TABLE IF NOT EXISTS "contacts" (
	"id" BIGINT UNSIGNED PRIMARY KEY,
	"type" ENUM('legalperson', 'physicalperson')
);

CREATE TABLE IF NOT EXISTS "contact_names" (
	"contact_id" BIGINT UNSIGNED,
	"position" INT NOT NULL,
	"value" VARCHAR(50) NOT NULL,
	"compound" BOOLEAN DEFAULT FALSE,

	PRIMARY KEY("contact_id", "value", "position"),
	FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
);

CREATE TABLE IF NOT EXISTS "contact_titles" (
	"contact_id" BIGINT UNSIGNED,
	"title" VARCHAR(10),
	"priority" INT DEFAULT 1,

	PRIMARY KEY("contact_id", "title"),
	FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
)

CREATE TABLE IF NOT EXISTS "contact_addresses" (
	"id" BIGINT UNSIGNED PRIMARY KEY,
	"contact_id" BIGINT UNSIGNED,
	"line1" VARCHAR(70),
	"line2" VARCHAR(70),
	"house_number" VARCHAR(16),
	"postal_code" VARCHAR(16),
	"locality" VARCHAR(35),

	FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
);

CREATE TABLE IF NOT EXISTS "realms" (
    "id" SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    "name" VARCHAR(16) UNIQUE NOT NULL -- e.g., "Government ID", "communication"
);

CREATE TABLE IF NOT EXISTS "key_types" (
    "id" SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    "realm_id" SMALLINT UNSIGNED NOT NULL,
    "name" VARCHAR(16) NOT NULL,
    UNIQUE ("realm_id", "name"), -- e.g., "SSN", "mail"
    FOREIGN KEY ("realm_id") REFERENCES "realms"("id")
);

CREATE TABLE IF NOT EXISTS "contact_keys" (
    "id" BIGINT UNSIGNED PRIMARY KEY,
    "contact_id" BIGINT UNSIGNED NOT NULL,
    "key_type_id" SMALLINT UNSIGNED NOT NULL,
    "value" VARCHAR(100) NOT NULL,
    "label" VARCHAR(50), -- Renamed "name" for clarity, nullable
    "priority" INT DEFAULT 1,
	"verified" BOOLEAN DEFAULT false,
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id"),
    FOREIGN KEY ("key_type_id") REFERENCES "key_types"("id")
);



---- UPDATE FOR X VERSION

-- CLEANUP
DROP TABLE IF EXISTS tseg;

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE quantity DROP FOREIGN KEY quantity_ibfk_4;
ALTER TABLE prixheure DROP FOREIGN KEY prixheure_ibfk_1;
ALTER TABLE htime DROP FOREIGN KEY htime_ibfk_1;

ALTER TABLE person DROP PRIMARY KEY;
ALTER TABLE person MODIFY COLUMN person_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE person ADD PRIMARY KEY(person_id);
ALTER TABLE person MODIFY COLUMN person_modified INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE person MODIFY COLUMN person_created INT UNSIGNED NOT NULL DEFAULT 0;
UPDATE person SET person_deleted = 0 WHERE person_deleted IS NULL;
ALTER TABLE person MODIFY COLUMN person_deleted INT UNSIGNED NOT NULL DEFAULT 0;


ALTER TABLE quantity MODIFY COLUMN quantity_person BIGINT UNSIGNED DEFAULT NULL;
ALTER TABLE quantity ADD CONSTRAINT quantity_ibfk_4 FOREIGN KEY (quantity_person) REFERENCES person(person_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE prixheure MODIFY COLUMN prixheure_person BIGINT UNSIGNED NOT NULL;
ALTER TABLE prixheure ADD CONSTRAINT prixheure_ibfk_1 FOREIGN KEY (prixheure_person) REFERENCES person(person_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE htime MODIFY COLUMN htime_person BIGINT UNSIGNED NOT NULL;
ALTER TABLE htime ADD CONSTRAINT htime_ibfk_1 FOREIGN KEY (htime_person) REFERENCES person(person_id) ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE kaalauth MODIFY COLUMN userid BIGINT UNSIGNED NOT NULL; 
ALTER TABLE kaalauth ADD COLUMN tenant_id INT UNSIGNED NOT NULL DEFAULT 1;
CREATE INDEX idxUserId ON kaalauth (userid);
CREATE INDEX idxTenantId ON kaalauth (tenant_id);

-- START IMPLENTING tenants.
CREATE TABLE IF NOT EXISTS tenants (
	id INTEGER UNSIGNED AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
	created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	INDEX idx_name (name)
);
INSERT INTO tenants (name, status) VALUES ('Default tenant', 'active');

ALTER TABLE person ADD COLUMN tenant_id INTEGER UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE person ADD CONSTRAINT fkPersonToTenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE person MODIFY COLUMN person_username VARCHAR(100) NOT NULL;
ALTER TABLE person ADD CONSTRAINT uUsernameTenant UNIQUE(tenant_id,person_username);

-- CREATE NEW TABLE FOR PERSON
CREATE TABLE IF NOT EXISTS person_details (
	person_id BIGINT UNSIGNED NOT NULL,
	tenant_id INTEGER UNSIGNED NOT NULL DEFAULT 1,
	avs_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
	employee_number VARCHAR(24) NOT NULL DEFAULT '',
	sex CHAR(1) NOT NULL DEFAULT '',
	birthday DATE DEFAULT NULL,
	nationality CHAR(2) NOT NULL DEFAULT '',
	canton_residency CHAR(2) NOT NULL DEFAULT '',
	residency_type TINYINT NOT NULL DEFAULT 0,
	language CHAR(2) NOT NULL DEFAULT '',
	PRIMARY KEY (person_id),
	INDEX idxAvsNumber (avs_number),
	FOREIGN KEY (person_id) REFERENCES person (person_id) ON DELETE CASCADE ON UPDATE CASCADE,
	INDEX idxTenantId (tenant_id),
	UNIQUE INDEX idxTenantEmployee (tenant_id,employee_number)
);

CREATE TABLE IF NOT EXISTS person_documents (
  id BIGINT UNSIGNED NOT NULL,
  person_id BIGINT UNSIGNED NOT NULL,
  tenant_id INTEGER UNSIGNED NOT NULL DEFAULT 1,
  name VARCHAR(60) NOT NULL,
  descirption VARCHAR(240) NOT NULL DEFAULT '',
  hash BINARY(16) NOT NULL,
  mimetype VARCHAR(255) NOT NULL DEFAULT 'application/octet-stream',
	FOREIGN KEY (person_id) REFERENCES person (person_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE INDEX idxDocumentTenantHash (person_id,tenant_id,hash)
);

CREATE TABLE IF NOT EXISTS person_civilStatus (
	id BIGINT UNSIGNED PRIMARY KEY,
	person_id BIGINT UNSIGNED NOT NULL,
	tenant_id INTEGER UNSIGNED NOT NULL DEFAULT 1,
	status TINYINT DEFAULT 0,
	valid DATE NOT NULL,
	FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE ON UPDATE CASCADE,
	INDEX idxTenantId (tenant_id),
	INDEX idxTenantPersonValid (tenant_id, person_id, valid),
	UNIQUE INDEX idxPersonValid (person_id, valid)
);

-- CREATE TABLES FOR ACLS
CREATE TABLE IF NOT EXISTS acls (
	person_id BIGINT UNSIGNED NOT NULL,
	tenant_id INTEGER UNSIGNED NOT NULL DEFAULT 1,
	module VARCHAR(40) NOT NULL,
	PRIMARY KEY (person_id, tenant_id, module),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Modify groupuser table
ALTER TABLE groupuser DROP COLUMN groupuser_uid;
ALTER TABLE groupuser MODIFY COLUMN groupuser_user BIGINT UNSIGNED NOT NULL;
ALTER TABLE groupuser MODIFY COLUMN groupuser_group BIGINT UNSIGNED NOT NULL;
ALTER TABLE groupuser ADD COLUMN tenant_id INT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE groupuser ADD PRIMARY KEY(groupuser_user, groupuser_group, tenant_id);
ALTER TABLE groupuser ADD CONSTRAINT fkUserToGroup FOREIGN KEY (groupuser_user) REFERENCES person(person_id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE groupuser ADD CONSTRAINT fkGroupToGroup FOREIGN KEY (groupuser_group) REFERENCES `group`(group_uid) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE groupuser ADD CONSTRAINT fkTenantIdToTenant FOREIGN KEY (tenant_id) REFERENCES `tenants`(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Modify group table
ALTER TABLE `group` ADD COLUMN tenant_id INTEGER UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE `group` MODIFY COLUMN group_uid BIGINT UNSIGNED NOT NULL;
ALTER TABLE `group` ADD CONSTRAINT fkGroupToTenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `prixheure` MODIFY COLUMN `prixheure_id` BIGINT UNSIGNED NOT NULL;
ALTER TABLE `prixheure` ADD COLUMN `tenant_id` INT UNSIGNED NOT NULL DEFAULT 1; 
ALTER TABLE `prixheure` ADD CONSTRAINT fkTenantId FOREIGN KEY (`tenand_id`) REFERENCES `tenants`(id) ON DELETE CASCADE ON UPDATE CASCADE;


CREATE TABLE IF NOT EXISTS sequences (
  id BIGINT UNSIGNED NOT NULL,
  tenant_id INTEGER UNSIGNED NOT NULL DEFAULT 1,
  name VARCHAR(30) NOT NULL,
  value INT UNSIGNED DEFAULT 0,
  PRIMARY KEY (id, tenant_id),
  UNIQUE INDEX idxNameTenant (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS configurations (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  tenant_id INTEGER UNSIGNED NOT NULL DEFAULT 1,
  key_path VARCHAR(255) NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  private BOOLEAN DEFAULT true,
  encrypted BOOLEAN DEFAULT false,
  UNIQUE INDEX idxPathTenant (key_path, tenant_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  tenant_id INTEGER UNSIGNED NOT NULL DEFAULT 1,
  user_id BIGINT UNSIGNED NOT NULL,
  name VACRHAR(255) NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  UNIQUE INDEX idxUserNameTenant (name, tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS filesystem (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  tenant_id INTEGER UNSIGNED NOT NULL DEFAULT 1,
  parent_id BIGINT UNSIGNED NOT NULL,
  owner_id BIGINT UNSIGNED NULL,
  is_directory BOOLEAN NOT NULL DEFAULT FALSE,
  name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  type VARCHAR(127) NOT NULL DEFAULT 'application/octet-stream',
  size BIGINT UNSIGNED NOT NULL,
  hash VARCHAR(32) NOT NULL,
  INDEX idxName (name) USING HASH,
  UNIQUE INDEX idxParentTenantName (name, tenant_id, parent_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (owner_id) REFERENCES person(person_id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES filesystem(id) ON DELETE CASCADE
);


