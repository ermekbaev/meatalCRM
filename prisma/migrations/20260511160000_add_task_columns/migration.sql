-- CreateTable
CREATE TABLE "TaskColumn" (
  "id"        TEXT NOT NULL,
  "key"       TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "color"     TEXT NOT NULL DEFAULT '#94a3b8',
  "order"     INTEGER NOT NULL DEFAULT 0,
  "isSystem"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskColumn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskColumn_key_key" ON "TaskColumn"("key");

-- Seed default columns
INSERT INTO "TaskColumn" ("id","key","name","color","order","isSystem") VALUES
  ('clsystaskcoltodo000000','TODO','К выполнению','#94a3b8',0,true),
  ('clsystaskcolpendin0000','PENDING_APPROVAL','На согласовании','#a855f7',1,true),
  ('clsystaskcolinprogr000','IN_PROGRESS','В работе','#f59e0b',2,true),
  ('clsystaskcoldone000000','DONE','Выполнено','#10b981',3,true),
  ('clsystaskcolcancell000','CANCELLED','Отменено','#ef4444',4,true);

-- Convert Task.status from enum to text (keep values)
ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'TODO';
