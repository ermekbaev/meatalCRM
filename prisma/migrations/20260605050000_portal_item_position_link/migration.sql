-- AlterTable
ALTER TABLE "PortalRequestItem" ADD COLUMN "positionId" TEXT;

-- AddForeignKey
ALTER TABLE "PortalRequestItem" ADD CONSTRAINT "PortalRequestItem_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "ClientPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
