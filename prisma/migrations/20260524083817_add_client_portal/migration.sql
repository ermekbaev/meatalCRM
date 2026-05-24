-- CreateEnum
CREATE TYPE "PortalRequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'READY');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PORTAL_REQUEST_CREATED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CLIENT';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "isPortalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "managerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "PortalRequest" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PortalRequestStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalRequestItem" (
    "id" TEXT NOT NULL,
    "portalRequestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'шт',

    CONSTRAINT "PortalRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalComment" (
    "id" TEXT NOT NULL,
    "portalRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalFile" (
    "id" TEXT NOT NULL,
    "portalRequestId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPosition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'шт',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalRequest_number_key" ON "PortalRequest"("number");

-- CreateIndex
CREATE INDEX "PortalRequest_companyId_createdAt_idx" ON "PortalRequest"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "PortalComment_portalRequestId_createdAt_idx" ON "PortalComment"("portalRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientPosition_companyId_idx" ON "ClientPosition"("companyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalRequest" ADD CONSTRAINT "PortalRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalRequest" ADD CONSTRAINT "PortalRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalRequestItem" ADD CONSTRAINT "PortalRequestItem_portalRequestId_fkey" FOREIGN KEY ("portalRequestId") REFERENCES "PortalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalComment" ADD CONSTRAINT "PortalComment_portalRequestId_fkey" FOREIGN KEY ("portalRequestId") REFERENCES "PortalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalComment" ADD CONSTRAINT "PortalComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalFile" ADD CONSTRAINT "PortalFile_portalRequestId_fkey" FOREIGN KEY ("portalRequestId") REFERENCES "PortalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalFile" ADD CONSTRAINT "PortalFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPosition" ADD CONSTRAINT "ClientPosition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
