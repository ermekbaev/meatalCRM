-- AlterTable
ALTER TABLE "PortalRequest" ADD COLUMN     "firstViewedAt" TIMESTAMP(3);

-- Бэкфил: считаем все уже существующие заявки «открытыми» в момент создания.
-- Иначе после деплоя ВСЕ старые заявки внезапно зажглись бы бейджами «новые»,
-- что мусор для менеджеров. После этой строки «новыми» считаются только те,
-- что приедут после миграции и ещё не открыты ADMIN/MANAGER.
UPDATE "PortalRequest" SET "firstViewedAt" = "createdAt" WHERE "firstViewedAt" IS NULL;
