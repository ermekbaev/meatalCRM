-- Производственные статусы на уровне задачи (лазер, гибка, покраска, пескоструй)
ALTER TABLE "Task"
  ADD COLUMN "laserStatus"        TEXT,
  ADD COLUMN "bendingStatus"      TEXT,
  ADD COLUMN "paintingStatus"     TEXT,
  ADD COLUMN "sandblastingStatus" TEXT;
