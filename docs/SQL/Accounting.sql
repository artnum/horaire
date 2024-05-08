SET SQL_MODE=ANSI_QUOTES;

-- TYPE of accounting document
-- offer: offer for a project
-- execution: record of changes from the offer during the project, in the end, the execution is the final offer and the invoice matches the execution
-- invoice: invoice for a project
-- creditnote: credit note for a project
-- debitnote: debit note for a project
-- payment: payment for a project
-- reimbursement: reimbursement for a project
-- other: other accounting document for a project
CREATE TABLE IF NOT EXISTS "accountingDoc" (
	"id" BIGINT UNSIGNED PRIMARY KEY,
	"reference" VARCHAR(24) NOT NULL, -- reference number, sequential within a project
	"variant" INT UNSIGNED NOT NULL DEFAULT 0, -- variant number, sequential within a project
	"name" VARCHAR(160) NOT NULL DEFAULT '', -- name of the document
	"description" TEXT NOT NULL DEFAULT '', -- description of the document
	"date" VARCHAR(16) NOT NULL, -- date of the document (GMT date/time : "YYYY-MM-DD HH:MM" format)
	"type" ENUM('offer', 'order', 'execution', 'invoice', 'creditnote', 'debitnote', 'payment', 'reimbursement', 'other') DEFAULT 'offer',
	"project" BIGINT UNSIGNED DEFAULT NULL, -- for offer, no project associated, so 0
	"contact" BIGINT UNSIGNED DEFAULT NULL, -- contact for this document
	"condition" BIGINT UNSIGNED DEFAULT 0, -- condition for taxes and all, must always be set
	"extid" VARCHAR(160) NOT NULL DEFAULT '', -- ID for external accounting system
	"related" BIGINT UNSIGNED DEFAULT NULL, -- ID of the related document, if any
	"created" INTEGER UNSIGNED DEFAULT 0, -- timestamp of creation
	"deleted" INTEGER UNSIGNED DEFAULT 0, -- timestamp of deletion
	FOREIGN KEY ("related") REFERENCES "accountingDoc" ("id"),
	FOREIGN KEY ("project") REFERENCES "project" ("project_id"),
	UNIQUE("reference", "variant")
);

CREATE TABLE IF NOT EXISTS "accountingDocLine" (
	"id" BIGINT UNSIGNED PRIMARY KEY,
    "docid" BIGINT UNSIGNED NOT NULL,
	"position" VARCHAR(16) NOT NULL,
	"description" VARCHAR(160) NOT NULL,
	"quantity" FLOAT DEFAULT 0.0,
	"unit" VARCHAR(160) DEFAULT '',
	"price" FLOAT DEFAULT 0.0,
	"type" ENUM('item', 'addition', 'suppression') DEFAULT 'item',
	"related" BIGINT UNSIGNED DEFAULT NULL,
    "state" ENUM('open', 'frozen', 'billed') DEFAULT 'open',
    FOREIGN KEY ("docid") REFERENCES "accountingDoc" ("id"),
	FOREIGN KEY ("related") REFERENCES "accountingDocLine" ("id"),
    UNIQUE ("docid", "position")
);

CREATE TABLE IF NOT EXISTS "accountingDocConditionValues" (
	"docid" BIGINT UNSIGNED NOT NULL,
	"name" VARCHAR(160) NOT NULL,
	"value" FLOAT DEFAULT 0.0,
	"type" ENUM('absolute', 'percent') DEFAULT 'absolute',
	FOREIGN KEY ("docid") REFERENCES "accountingDoc" ("id"),
	UNIQUE ("docid", "name")
);

-- OLD DON'T USE, keep for reference
-- condition set are "kind of" immutable
CREATE TABLE IF NOT EXISTS "accountingDocConditionSet" (
	"accountingDocConditionSet_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"accountingDocConditionSet_name" VARCHARE(160) NOT NULL,
	"accountingDocConditionSet_replacedby" INTEGER UNSIGNED DEFAULT 0, -- if not 0, this condition set is replaced by the one with this ID
);

CREATE TABLE IF NOT EXISTS "accountingDocConditionLine" (
	"accountingDocConditionLine_id" INTEGER PRIMARY KEY AUTO_INCREMENT,
	"accountingDocConditionLine_setid" INTEGER UNSIGNED NOT NULL,
	"accountingDocConditionLine_position" INTEGER UNSIGNED NOT NULL,
	"accountingDocConditionLine_name" VARCHAR(160) NOT NULL,
	"accountingDocConditionLine_type" ENUM('surcharge', 'discount', 'rounding') DEFAULT 'surcharge',
	"accountingDocConditionLine_valuetype" ENUM('absolute', 'percent') DEFAULT 'percent',
	"accountingDocConditionLine_value" FLOAT DEFAULT 0.0,
	"accountingDocConditionLine_subtotal" BOOLEAN DEFAULT FALSE -- if true, this condition generate a subtotal that would be used for next conditions
	"accountingDocConditionLine_account" INTEGER UNSIGNED DEFAULT 0, -- if 0, this condition line is linked to an account
);

