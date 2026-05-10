import { prisma } from "@/lib/prisma";

export type Role = "ADMIN" | "MANAGER" | "FOREMAN" | "EMPLOYEE";

export const isAdmin = (role: Role) => role === "ADMIN";
export const isAdminOrManager = (role: Role) => role === "ADMIN" || role === "MANAGER";
export const canManageTasks = (role: Role) => role === "ADMIN" || role === "MANAGER";
export const canManageSubtasks = (role: Role) =>
  role === "ADMIN" || role === "MANAGER" || role === "FOREMAN";

// Проверяет, что FOREMAN/MANAGER/ADMIN имеет доступ к подзадачам этой задачи.
// FOREMAN — только если состоит в цехе задачи (или задача без цеха).
export async function canForemanAccessTask(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      workshopId: true,
      workshop: { select: { members: { where: { id: userId }, select: { id: true } } } },
    },
  });
  if (!task) return false;
  if (!task.workshopId) return true;
  return (task.workshop?.members.length ?? 0) > 0;
}
