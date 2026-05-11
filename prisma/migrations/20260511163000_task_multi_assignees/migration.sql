-- CreateTable for implicit M2M relation "AssignedTasks" (Task[] <-> User[])
CREATE TABLE "_AssignedTasks" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,

  CONSTRAINT "_AssignedTasks_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_AssignedTasks_B_index" ON "_AssignedTasks"("B");

ALTER TABLE "_AssignedTasks" ADD CONSTRAINT "_AssignedTasks_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_AssignedTasks" ADD CONSTRAINT "_AssignedTasks_B_fkey"
  FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: переносим существующие Task.assigneeId в связь many-to-many
INSERT INTO "_AssignedTasks" ("A","B")
SELECT id, "assigneeId" FROM "Task" WHERE "assigneeId" IS NOT NULL;

-- Drop legacy column
ALTER TABLE "Task" DROP CONSTRAINT "Task_assigneeId_fkey";
ALTER TABLE "Task" DROP COLUMN "assigneeId";
