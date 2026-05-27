-- Авто-архивация выполненных задач: через сколько часов после DONE задача уезжает в архив.
-- 0 — выключить авто-архивацию. По умолчанию 24 часа.
ALTER TABLE "CompanySettings" ADD COLUMN "taskAutoArchiveHours" INTEGER NOT NULL DEFAULT 24;
