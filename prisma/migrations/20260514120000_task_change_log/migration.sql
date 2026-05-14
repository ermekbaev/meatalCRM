-- История изменений задач
CREATE TABLE "TaskChangeLog" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskChangeLog_taskId_createdAt_idx" ON "TaskChangeLog"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "TaskChangeLog" ADD CONSTRAINT "TaskChangeLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChangeLog" ADD CONSTRAINT "TaskChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
