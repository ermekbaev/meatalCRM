-- AlterTable: lock flag
ALTER TABLE "Request" ADD COLUMN "lockedAt" TIMESTAMP(3);

-- CreateTable: categories
CREATE TABLE "RequestSubtaskCategory" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestSubtaskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestSubtaskCategory_requestId_idx" ON "RequestSubtaskCategory"("requestId");

-- AddForeignKey
ALTER TABLE "RequestSubtaskCategory" ADD CONSTRAINT "RequestSubtaskCategory_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: subtasks
CREATE TABLE "RequestSubtask" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestSubtask_categoryId_idx" ON "RequestSubtask"("categoryId");

-- AddForeignKey
ALTER TABLE "RequestSubtask" ADD CONSTRAINT "RequestSubtask_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "RequestSubtaskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
