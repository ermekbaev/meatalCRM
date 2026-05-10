import { prisma } from "@/lib/prisma";

export type Role = "ADMIN" | "MANAGER" | "FOREMAN" | "EMPLOYEE";

export const isAdmin = (role: Role) => role === "ADMIN";
export const isAdminOrManager = (role: Role) => role === "ADMIN" || role === "MANAGER";
export const canManageTasks = (role: Role) => role === "ADMIN" || role === "MANAGER";
export const canManageSubtasks = (role: Role) =>
  role === "ADMIN" || role === "MANAGER" || role === "FOREMAN";

// FOREMAN имеет доступ к подзадачам только тех задач, где он ответственный.
export async function canForemanAccessTask(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true },
  });
  return task?.assigneeId === userId;
}
