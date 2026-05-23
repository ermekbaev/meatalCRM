import { prisma } from "@/lib/prisma";

export type Role = "ADMIN" | "MANAGER" | "FOREMAN" | "ENGINEER" | "EMPLOYEE" | "CONTRACTOR";

export const isAdmin = (role: Role) => role === "ADMIN";
export const isAdminOrManager = (role: Role) => role === "ADMIN" || role === "MANAGER";
export const canManageTasks = (role: Role) => role === "ADMIN" || role === "MANAGER";
// Видит только задачи, где он среди исполнителей. CONTRACTOR — только read-only.
export const isAssigneeRole = (role: Role) =>
  role === "FOREMAN" || role === "ENGINEER" || role === "CONTRACTOR";
export const isContractor = (role: Role) => role === "CONTRACTOR";
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

// ─── Доступ к файлам (защита от IDOR) ─────────────────────────────────────────
//
// Ключи в S3 имеют вид `<folder>/<uuid>.<ext>` (см. lib/storage.ts → uploadFile).
// Разрешённые папки и допустимые символы строго ограничены, чтобы исключить
// path traversal (`..`, вложенные слеши, абсолютные пути).
const FILE_KEY_RE = /^(requests|tasks|company|avatars)\/[A-Za-z0-9._-]+$/;

/**
 * Проверяет, имеет ли пользователь право получить файл по S3-ключу.
 *
 * - requests/* — только если есть доступ к родительской заявке.
 * - tasks/*    — только если есть доступ к родительской задаче.
 * - company/*, avatars/* — логотип/печать/подпись и аватары показываются по
 *   всему приложению, доступны любому авторизованному пользователю.
 *
 * Возвращает false при некорректном формате ключа, отсутствии записи в БД
 * или недостатке прав.
 */
export async function canAccessFileKey(
  key: string,
  role: Role,
  userId: string
): Promise<boolean> {
  if (!FILE_KEY_RE.test(key)) return false;

  const folder = key.split("/")[0];

  if (folder === "company" || folder === "avatars") {
    // Низкочувствительные ресурсы, видимые всем авторизованным пользователям.
    return true;
  }

  if (folder === "requests") {
    const isAssigneeOnly = role === "FOREMAN" || role === "ENGINEER";
    const file = await prisma.requestFile.findFirst({
      where: {
        filename: key,
        ...(isAssigneeOnly ? { request: { assigneeId: userId } } : {}),
      },
      select: { id: true },
    });
    return file !== null;
  }

  if (folder === "tasks") {
    const canSeeAll = role === "ADMIN" || role === "MANAGER" || role === "ENGINEER";
    if (canSeeAll) {
      const file = await prisma.taskFile.findFirst({
        where: { filename: key },
        select: { id: true },
      });
      return file !== null;
    }

    const isAssigneeRole = role === "FOREMAN" || role === "CONTRACTOR";
    // EMPLOYEE дополнительно видит задачи своего цеха и задачи без цеха,
    // если он состоит в виртуальном цехе.
    let noWsVisible = false;
    if (!isAssigneeRole) {
      const virtual = await prisma.workshop.findFirst({
        where: { isVirtual: true, members: { some: { id: userId } } },
        select: { id: true },
      });
      noWsVisible = virtual !== null;
    }

    const file = await prisma.taskFile.findFirst({
      where: {
        filename: key,
        task: isAssigneeRole
          ? { assignees: { some: { id: userId } } }
          : {
              OR: [
                { assignees: { some: { id: userId } } },
                ...(noWsVisible ? [{ workshopId: null }] : []),
                { workshop: { members: { some: { id: userId } } } },
              ],
            },
      },
      select: { id: true },
    });
    return file !== null;
  }

  return false;
}
