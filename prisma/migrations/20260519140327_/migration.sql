/*
  Warnings:

  - The primary key for the `_AssignedTasks` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_AssignedTasks` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_AssignedTasks" DROP CONSTRAINT "_AssignedTasks_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_AssignedTasks_AB_unique" ON "_AssignedTasks"("A", "B");
