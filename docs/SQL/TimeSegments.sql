CREATE TABLE IF NOT EXISTS "tseg" (
       "tseg_id" INTEGER PRIMARY KEY AUTOINCREMENT,
       "tseg_date" CHAR(10) NOT NULL DEFAULT '',
       "tseg_travail" INTEGER NOT NULL,
       "tseg_time" INTEGER NOT NULL,
       "tseg_person" INTEGER NOT NULL,
       "tseg_efficiency" FLOAT NOT NULL DEFAULT 1.0,
       "tseg_color" CHAR(40) NOT NULL DEFAULT 'hsla(45, 100%, 50%, 1)',
       FOREIGN KEY ("tseg_travail") REFERENCES "travail"("travail_id") ON UPDATE CASCADE ON DELETE CASCADE,
       FOREIGN KEY ("tseg_person") REFERENCES "person"("person_id") ON UPDATE CASCADE ON DELETE CASCADE
);
