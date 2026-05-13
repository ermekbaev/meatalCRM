-- Переносим производственные статусы с RequestItem на Request

-- 1. Добавляем колонки в Request
ALTER TABLE "Request"
  ADD COLUMN "hasMetal"           TEXT,
  ADD COLUMN "metalOwner"         TEXT,
  ADD COLUMN "laserStatus"        TEXT,
  ADD COLUMN "bendingStatus"      TEXT,
  ADD COLUMN "paintingStatus"     TEXT,
  ADD COLUMN "sandblastingStatus" TEXT,
  ADD COLUMN "extraWorkStatus"    TEXT,
  ADD COLUMN "deliveryStatus"     TEXT;

-- 2. Бэкфилл: для каждой заявки берём значения первой (по id) позиции,
--    у которой соответствующее поле заполнено
UPDATE "Request" r
SET
  "hasMetal" = sub."hasMetal",
  "metalOwner" = sub."metalOwner",
  "laserStatus" = sub."laserStatus",
  "bendingStatus" = sub."bendingStatus",
  "paintingStatus" = sub."paintingStatus",
  "extraWorkStatus" = sub."extraWorkStatus",
  "deliveryStatus" = sub."deliveryStatus"
FROM (
  SELECT
    "requestId",
    (ARRAY_AGG("hasMetal"        ORDER BY id) FILTER (WHERE "hasMetal"        IS NOT NULL))[1] AS "hasMetal",
    (ARRAY_AGG("metalOwner"      ORDER BY id) FILTER (WHERE "metalOwner"      IS NOT NULL))[1] AS "metalOwner",
    (ARRAY_AGG("laserStatus"     ORDER BY id) FILTER (WHERE "laserStatus"     IS NOT NULL))[1] AS "laserStatus",
    (ARRAY_AGG("bendingStatus"   ORDER BY id) FILTER (WHERE "bendingStatus"   IS NOT NULL))[1] AS "bendingStatus",
    (ARRAY_AGG("paintingStatus"  ORDER BY id) FILTER (WHERE "paintingStatus"  IS NOT NULL))[1] AS "paintingStatus",
    (ARRAY_AGG("extraWorkStatus" ORDER BY id) FILTER (WHERE "extraWorkStatus" IS NOT NULL))[1] AS "extraWorkStatus",
    (ARRAY_AGG("deliveryStatus"  ORDER BY id) FILTER (WHERE "deliveryStatus"  IS NOT NULL))[1] AS "deliveryStatus"
  FROM "RequestItem"
  GROUP BY "requestId"
) sub
WHERE r.id = sub."requestId";

-- 3. Удаляем старые колонки с RequestItem
ALTER TABLE "RequestItem"
  DROP COLUMN "hasMetal",
  DROP COLUMN "metalOwner",
  DROP COLUMN "laserStatus",
  DROP COLUMN "bendingStatus",
  DROP COLUMN "paintingStatus",
  DROP COLUMN "extraWorkStatus",
  DROP COLUMN "deliveryStatus";
