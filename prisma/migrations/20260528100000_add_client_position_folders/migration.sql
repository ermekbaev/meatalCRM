-- CreateTable
CREATE TABLE "ClientPositionFolder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPositionFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientPositionFolder_companyId_idx" ON "ClientPositionFolder"("companyId");

-- AddForeignKey
ALTER TABLE "ClientPositionFolder" ADD CONSTRAINT "ClientPositionFolder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ClientPosition" ADD COLUMN "folderId" TEXT;

-- CreateIndex
CREATE INDEX "ClientPosition_folderId_idx" ON "ClientPosition"("folderId");

-- AddForeignKey
ALTER TABLE "ClientPosition" ADD CONSTRAINT "ClientPosition_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ClientPositionFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
