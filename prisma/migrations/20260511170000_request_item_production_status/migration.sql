-- Add per-item production status fields
ALTER TABLE "RequestItem"
  ADD COLUMN "hasMetal"        TEXT,
  ADD COLUMN "metalOwner"      TEXT,
  ADD COLUMN "laserStatus"     TEXT,
  ADD COLUMN "bendingStatus"   TEXT,
  ADD COLUMN "extraWorkStatus" TEXT,
  ADD COLUMN "deliveryStatus"  TEXT;
