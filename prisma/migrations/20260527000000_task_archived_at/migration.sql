-- AlterTable: добавляем поле архивации задач.
-- NULL = задача не в архиве; DateTime = момент архивации (вручную или авто).
ALTER TABLE "Task" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Индекс ускоряет частый запрос «archivedAt IS NULL» в листинге.
CREATE INDEX "Task_archivedAt_idx" ON "Task"("archivedAt");
