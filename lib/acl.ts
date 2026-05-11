import { prisma } from "@/lib/prisma";

export type Role = "ADMIN" | "MANAGER" | "FOREMAN" | "ENGINEER" | "EMPLOYEE";

export const isAdmin = (role: Role) => role === "ADMIN";
export const isAdminOrManager = (role: Role) => role === "ADMIN" || role === "MANAGER";
export const canManageTasks = (role: Role) => role === "ADMIN" || role === "MANAGER";
export const isAssigneeRole = (role: Role) => role === "FOREMAN" || role === "ENGINEER";
export const canManageSubtasks = (role: Role) =>
  role === "ADMIN" || role === "MANAGER" || role === "FOREMAN" || role === "ENGINEER";

// FOREMAN/ENGINEER имеют доступ к подзадачам только тех задач, где они среди ответственных.
export async function canForemanAccessTask(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, assignees: { some: { id: userId } } },
    select: { id: true },
  });
  return task !== null;
}
