-- CreateEnum
CREATE TYPE "ClientRelationStatus" AS ENUM ('NEW', 'IN_WORK', 'THINKING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowUpResult" AS ENUM ('REACHED', 'NO_ANSWER', 'CALL_BACK', 'REFUSED', 'AGREED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FOLLOWUP_DUE';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "relationStatus" "ClientRelationStatus" NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "result" "FollowUpResult",
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUp_assigneeId_status_dueDate_idx" ON "FollowUp"("assigneeId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "FollowUp_clientId_createdAt_idx" ON "FollowUp"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "FollowUp_status_dueDate_notifiedAt_idx" ON "FollowUp"("status", "dueDate", "notifiedAt");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
