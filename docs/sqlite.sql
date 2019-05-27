PRAGMA "foreign_keys" = ON;

CREATE TABLE IF NOT EXISTS "category" (
	"category_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"category_name" TEXT DEFAULT NULL,
	"category_description" TEXT DEFAULT NULL,
	"category_created" INTEGER DEFAULT NULL,
	"category_deleted" INTEGER DEFAULT NULL,
	"category_modified" INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "quantity" (
	"quantity_id" INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE TABLE IF NOT EXISTS "item" (
	"item_id" INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE TABLE IF NOT EXISTS "person" (
	"person_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"person_name" TEXT DEFAULT NULL,
	"person_username" TEXT NOT NULL UNIQUE,
	"person_level" INTEGER DEFAULT 1,
	"person_key" TEXT DEFAULT NULL,
	"person_keyopt" TEXT DEFAULT '{salt: "09F911029D74E35B", iteration: 1000}', -- json data containing iteration, salt and more if apply
	"person_disabled" INTEGER DEFAULT 0,
	"person_deleted" INTEGER DEFAULT NULL,
	"person_created" INTEGER DEFAULT NULL,
	"person_modified" INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "project" (
	"project_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"project_reference" TEXT DEFAULT NULL,
	"project_name" TEXT DEFAULT NULL,
	"project_closed" DATETIME DEFAULT NULL,
	"project_opened" DATETIME DEFAULT NULL,
	"project_targetEnd" DATETIME DEFAULT NULL,
	"project_deleted" INTEGER DEFAULT NULL,
	"project_created" INTEGER DEFAULT NULL,
	"project_modified" INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "process" (
	"process_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"process_name" TEXT DEFAULT NULL,
	"process_deleted" INTEGER DEFAULT NULL,
	"process_created" INTEGER DEFAULT NULL,
	"process_modified" INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "htime" (
	"htime_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"htime_day" TEXT DEFAULT NULL,
	"htime_value" INTEGER DEFAULT 0,
	"htime_project" INTEGER DEFAULT NULL,
	"htime_person" INTEGER DEFAULT NULL,
	"htime_travail" INTEGER DEFAULT NULL,
	"htime_process" INTEGER DEFAULT NULL,
	"htime_comment" TEXT DEFAULT NULL,
	"htime_other" TEXT DEFAULT NULL,  -- json data to handle useful information (like a date range if that apply)
	"htime_created" INTEGER DEFAULT NULL,
	"htime_deleted" INTEGER DEFAULT NULL,
	"htime_modified" INTEGER DEFAULT NULL,
	FOREIGN KEY("htime_person") REFERENCES "person"("person_id") ON UPDATE CASCADE ON DELETE SET NULL,
	FOREIGN KEY("htime_project") REFERENCES "project"("project_id") ON UPDATE CASCADE ON DELETE SET NULL,
	FOREIGN KEY("htime_process") REFERENCES "process"("process_id") ON UPDATE CASCADE ON DELETE SET NULL,
	FOREIGN KEY("htime_travail") REFERENCES "travail"("travail_id") ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "travail" ( -- table containing specific work to be done
	"travail_id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"travail_reference" VARCHAR(160) DEFAULT '',
	"travail_meeting" VARCHAR(160) DEFAULT '',
	"travail_contact" VARCHAR(160) DEFAULT '',
	"travail_phone" VARCHAR(160) DEFAULT '',
	"travail_description" TEXT DEFAULT '',
	"travail_project" INTEGER NOT NULL,
	"travail_created" INTEGER DEFAULT 0,
	"travail_modified" INTEGER DEFAULT 0,
	"travail_closed" INTEGER DEFAULT 0,
	"travail_progress" INTEGER DEFAULT 0,
	FOREIGN KEY("travail_project") REFERENCES "project"("project_id") ON UPDATE CASCADE ON DELETE CASCADE
);
