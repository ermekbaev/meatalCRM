-- CreateEnum
CREATE TYPE "PortalRequestPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "PortalRequest" ADD COLUMN "priority" "PortalRequestPriority" NOT NULL DEFAULT 'NORMAL';
