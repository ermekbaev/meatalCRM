import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export type Role = "ADMIN" | "MANAGER" | "FOREMAN" | "ENGINEER" | "EMPLOYEE" | "CONTRACTOR" | "CLIENT";

export const isAdmin = (role: Role) => role === "ADMIN";
export const isAdminOrManager = (role: Role) => role === "ADMIN" || role === "MANAGER";
export const isClient = (role: Role) => role === "CLIENT";
export const canManageTasks = (role: Role) => role === "ADMIN" || role === "MANAGER";

/**
 * Возвращает companyId клиента-портала из сессии. Используется в /api/portal/*:
 * companyId в запросе игнорируется, источник истины — сессия.
 * Возвращает null, если сессии нет, роль не CLIENT, либо у пользователя не задана компания.
 */
export function getPortalScope(session: Session | null): string | null {
  if (!session?.user) return null;
  if (session.user.role !== "CLIENT") return null;
  return session.user.companyId ?? null;
}

/**
 * Доступ к портальной заявке для роли запросившего:
 *  - CLIENT  → только если companyId заявки совпадает с session.user.companyId;
 *  - ADMIN   → к любой;
 *  - MANAGER → только если он `managerId` компании-владельца заявки;
 *  - прочие  → 403.
 *
 * Используется во всех `/api/portal/requests/[id]/*` для единой проверки.
 * Возвращает { id, companyId } или null (вызывающий бросает 404).
 */
export async function getPortalRequestAccess(
  session: Session | null,
  requestId: string
): Promise<{ id: string; companyId: string } | null> {
  if (!session?.user) return null;
  const role = session.user.role;

  if (role === "CLIENT") {
    if (!session.user.companyId) return null;
    return prisma.portalRequest.findFirst({
      where: { id: requestId, companyId: session.user.companyId },
      select: { id: true, companyId: true },
    });
  }
  if (role === "ADMIN") {
    return prisma.portalRequest.findFirst({
      where: { id: requestId },
      select: { id: true, companyId: true },
    });
  }
  if (role === "MANAGER") {
    return prisma.portalRequest.findFirst({
      where: { id: requestId, company: { managerId: session.user.id } },
      select: { id: true, companyId: true },
    });
  }
  return null;
}

/**
 * Для CLIENT: заявка в статусе «В работе» / «Готова» блокирует любое редактирование
 * (включая чек-листы). Менеджеры/админы не ограничены. Возвращает true, если
 * клиенту нужно запретить изменение.
 */
export async function isPortalRequestLockedForClient(
  requestId: string,
  role: string
): Promise<boolean> {
  if (role !== "CLIENT") return false;
  const r = await prisma.portalRequest.findUnique({
    where: { id: requestId },
    select: { status: true },
  });
  return r?.status === "IN_PROGRESS" || r?.status === "READY";
}
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
const FILE_KEY_RE = /^(requests|tasks|company|avatars|portal|positions)\/[A-Za-z0-9._-]+$/;

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

  // CLIENT — внешний пользователь компании. Файлы CRM (requests/, tasks/)
  // ему недоступны принципиально, независимо от знания ключа. Разрешены
  // только: portal/* (с проверкой ниже) и company/, avatars/ (низкочувствит.).
  if (role === "CLIENT" && folder !== "portal" && folder !== "company" && folder !== "avatars") {
    return false;
  }

  if (folder === "company" || folder === "avatars") {
    // Низкочувствительные ресурсы, видимые всем авторизованным пользователям.
    return true;
  }

  if (folder === "requests") {
    const isAssigneeOnly = role === "FOREMAN" || role === "ENGINEER";
    // Проверяем сначала в requestFile (исходная заявка).
    const inRequest = await prisma.requestFile.findFirst({
      where: {
        filename: key,
        ...(isAssigneeOnly ? { request: { assigneeId: userId } } : {}),
      },
      select: { id: true },
    });
    if (inRequest) return true;
    // Файлы задач, созданных из заявки, хранятся с ключом requests/xxx —
    // проверяем taskFile, чтобы не блокировать доступ к скопированным файлам.
    const inTask = await prisma.taskFile.findFirst({
      where: { filename: key },
      select: { id: true },
    });
    return inTask !== null;
  }

  if (folder === "portal") {
    // CLIENT — только файлы заявок своей компании; ADMIN — все;
    // MANAGER — заявок компаний, где он ответственный.
    if (role === "CLIENT") {
      const file = await prisma.portalFile.findFirst({
        where: {
          filename: key,
          portalRequest: { company: { portalUsers: { some: { id: userId } } } },
        },
        select: { id: true },
      });
      return file !== null;
    }
    if (role === "ADMIN") {
      const file = await prisma.portalFile.findFirst({
        where: { filename: key },
        select: { id: true },
      });
      return file !== null;
    }
    if (role === "MANAGER") {
      const file = await prisma.portalFile.findFirst({
        where: { filename: key, portalRequest: { company: { managerId: userId } } },
        select: { id: true },
      });
      return file !== null;
    }
    return false;
  }

  if (folder === "positions") {
    if (role === "CLIENT") {
      const f = await prisma.clientPositionFile.findFirst({
        where: { filename: key, position: { company: { portalUsers: { some: { id: userId } } } } },
        select: { id: true },
      });
      return f !== null;
    }
    if (role === "ADMIN") {
      const f = await prisma.clientPositionFile.findFirst({ where: { filename: key }, select: { id: true } });
      return f !== null;
    }
    if (role === "MANAGER") {
      const f = await prisma.clientPositionFile.findFirst({
        where: { filename: key, position: { company: { managerId: userId } } },
        select: { id: true },
      });
      return f !== null;
    }
    return false;
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
