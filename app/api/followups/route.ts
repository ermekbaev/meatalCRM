import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, badRequest } from "@/lib/api-handler";
import { isAdminOrManager, type Role } from "@/lib/acl";
import { followUpCreateSchema } from "@/lib/validation";
import type { Prisma } from "@prisma/client";

const followUpInclude = {
  client: { select: { id: true, name: true, shortName: true, phone: true, relationStatus: true } },
  assignee: { select: { id: true, name: true } },
  request: { select: { id: true, number: true, title: true } },
} satisfies Prisma.FollowUpInclude;

// Границы «сегодня» в серверном времени.
function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Видимость напоминаний по роли: ADMIN видит все; MANAGER — те, где он
 * ответственный/автор или ведёт контрагента. Возвращает Prisma-условие.
 */
function scopeWhere(role: Role, userId: string): Prisma.FollowUpWhereInput {
  if (role === "ADMIN") return {};
  return {
    OR: [
      { assigneeId: userId },
      { createdById: userId },
      { client: { managerId: userId } },
    ],
  };
}

/**
 * Список напоминаний/звонков. Параметры:
 *   scope = overdue | today | upcoming | done | all (по умолчанию all)
 *   clientId — история по конкретному контрагенту (любые статусы, новые сверху)
 *   mine = 1 — только назначенные мне (для экрана «На сегодня»)
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const role = session.user.role as Role;
  const userId = session.user.id;
  if (!isAdminOrManager(role)) throw forbidden();

  const { searchParams } = req.nextUrl;
  const scope = searchParams.get("scope") ?? "all";
  const clientId = searchParams.get("clientId");
  const mine = searchParams.get("mine") === "1";

  const and: Prisma.FollowUpWhereInput[] = [scopeWhere(role, userId)];
  if (mine) and.push({ assigneeId: userId });
  if (clientId) and.push({ clientId });

  const { start, end } = todayBounds();
  switch (scope) {
    case "overdue":
      and.push({ status: "PENDING", dueDate: { lt: start } });
      break;
    case "today":
      and.push({ status: "PENDING", dueDate: { gte: start, lt: end } });
      break;
    case "upcoming":
      and.push({ status: "PENDING", dueDate: { gte: end } });
      break;
    case "done":
      and.push({ status: "DONE" });
      break;
    // all — без фильтра по статусу
  }

  // История по клиенту — новые сверху; списки задач — по сроку.
  const orderBy: Prisma.FollowUpOrderByWithRelationInput =
    clientId || scope === "done" ? { createdAt: "desc" } : { dueDate: "asc" };

  const items = await prisma.followUp.findMany({
    where: { AND: and },
    include: followUpInclude,
    orderBy,
    take: 300,
  });
  return NextResponse.json(items);
});

/** Создать напоминание/запланировать звонок. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const role = session.user.role as Role;
  const userId = session.user.id;
  if (!isAdminOrManager(role)) throw forbidden();

  const data = await parseBody(req, followUpCreateSchema);

  const due = new Date(data.dueDate);
  if (Number.isNaN(due.getTime())) throw badRequest("Некорректная дата");

  // Проверяем, что контрагент существует (и доступен менеджеру).
  const client = await prisma.client.findFirst({
    where: {
      id: data.clientId,
      ...(role === "MANAGER" ? { OR: [{ managerId: userId }, { managerId: null }] } : {}),
    },
    select: { id: true },
  });
  if (!client) throw badRequest("Контрагент не найден");

  const created = await prisma.followUp.create({
    data: {
      clientId: data.clientId,
      requestId: data.requestId ?? null,
      // По умолчанию ответственный — текущий пользователь.
      assigneeId: data.assigneeId ?? userId,
      createdById: userId,
      dueDate: due,
      note: data.note?.trim() || null,
    },
    include: followUpInclude,
  });
  return NextResponse.json(created, { status: 201 });
});
