-- Add isVirtual flag to Workshop and seed a single virtual "Без цеха" entry
ALTER TABLE "Workshop" ADD COLUMN "isVirtual" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "Workshop" ("id","name","order","isVirtual","createdAt")
VALUES ('clsysworkshopnowsorgi0', 'Без цеха', -1, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
