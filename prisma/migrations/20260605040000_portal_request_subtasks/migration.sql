-- CreateTable
CREATE TABLE "PortalRequestSubtaskCategory" (
    "id" TEXT NOT NULL,
    "portalRequestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalRequestSubtaskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalRequestSubtaskCategory_portalRequestId_idx" ON "PortalRequestSubtaskCategory"("portalRequestId");

-- AddForeignKey
ALTER TABLE "PortalRequestSubtaskCategory" ADD CONSTRAINT "PortalRequestSubtaskCategory_portalRequestId_fkey"
    FOREIGN KEY ("portalRequestId") REFERENCES "PortalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PortalRequestSubtask" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalRequestSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalRequestSubtask_categoryId_idx" ON "PortalRequestSubtask"("categoryId");

-- AddForeignKey
ALTER TABLE "PortalRequestSubtask" ADD CONSTRAINT "PortalRequestSubtask_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "PortalRequestSubtaskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
