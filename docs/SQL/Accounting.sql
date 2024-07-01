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
	-- FOREIGN KEY ("project") REFERENCES "project" ("project_id"),
	UNIQUE("reference", "variant")
);

CREATE TABLE IF NOT EXISTS "accountingDocLine" (
	"id" BIGINT UNSIGNED PRIMARY KEY,
    "docid" BIGINT UNSIGNED NOT NULL,
	"position" VARCHAR(16) NOT NULL,
	"posref" VARCHAR(32) NOT NULL DEFAULT '', -- position from reference document (if any)
	"description" TEXT NOT NULL DEFAULT '', -- Description can be quite long
	"quantity" FLOAT DEFAULT 0.0,
	"unit" VARCHAR(160) DEFAULT '',
	"price" FLOAT DEFAULT 0.0,
	"type" ENUM('item', 'addition', 'suppression') DEFAULT 'item',
	"related" BIGINT UNSIGNED DEFAULT NULL,
    "state" ENUM('open', 'frozen', 'billed') DEFAULT 'open',
    FOREIGN KEY ("docid") REFERENCES "accountingDoc" ("id"),
	FOREIGN KEY ("related") REFERENCES "accountingDocLine" ("id")
);

-- changes to be done to remove unique index on docid
create index _doc_id using btree on accountingDocLine(docid);
drop index docid on accountingDocLine;
alter table accountingDocLine rename index _doc_id to docid;

CREATE TABLE IF NOT EXISTS "accountingDocConditionValues" (
	"docid" BIGINT UNSIGNED NOT NULL,
	"position" INT UNSIGNED NOT NULL,
	"name" VARCHAR(160) NOT NULL,
	"value" FLOAT DEFAULT 0.0,
	"type" ENUM(
		'absolute', -- absolute value
		'percent', -- percentage of previous value
		'subtotal' -- generate a subtotal of previous values
		) DEFAULT 'absolute',
	"relation" ENUM('add', 'sub') DEFAULT 'add', -- relation to previous value
	FOREIGN KEY ("docid") REFERENCES "accountingDoc" ("id"),
	UNIQUE ("docid", "name")
);