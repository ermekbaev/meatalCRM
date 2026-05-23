import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { TaskStatus, RequestPriority } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { createNotifications } from "@/lib/notify";
import { PRIORITY_LABELS } from "@/lib/utils";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { SAFETY_TAKE } from "@/lib/pagination";
import { taskCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search") ?? "";
  const statusList = (searchParams.get("status") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const priority = searchParams.get("priority") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";
  const workshopId = searchParams.get("workshopId") ?? "";
  const role = session.user.role;
  const userId = session.user.id;
  // Конструктор (ENGINEER) видит все задачи (в т.ч. где он отмечен исполнителем).
  const canSeeAll = role === "ADMIN" || role === "MANAGER" || role === "ENGINEER";

  const isAssigneeRole = role === "FOREMAN" || role === "CONTRACTOR";

  // Для EMPLOYEE задачи без цеха видны только участникам виртуального цеха "Без цеха"
  let noWsVisibleToEmployee = false;
  if (!canSeeAll && !isAssigneeRole) {
    const virtual = await prisma.workshop.findFirst({
      where: { isVirtual: true, members: { some: { id: userId } } },
      select: { id: true },
    });
    noWsVisibleToEmployee = !!virtual;
  }

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        search ? { OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ]} : {},
        statusList.length ? { status: { in: statusList as TaskStatus[] } }   : {},
        priority   ? { priority: priority as RequestPriority }              : {},
        assigneeId ? { assignees: { some: { id: assigneeId } } }            : {},
        workshopId === "none" ? { workshopId: null } : workshopId ? { workshopId } : {},
        canSeeAll ? {} : isAssigneeRole ? { assignees: { some: { id: userId } } } : {
          // EMPLOYEE (оператор) видит задачи, где он отмечен исполнителем,
          // плюс задачи своего цеха (как было раньше).
          OR: [
            { assignees: { some: { id: userId } } },
            ...(noWsVisibleToEmployee ? [{ workshopId: null }] : []),
            { workshop: { members: { some: { id: userId } } } },
          ],
        },
      ],
    },
    include: {
      assignees: { select: { id: true, name: true, position: true, role: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
      workshop:  { select: { id: true, name: true, order: true } },
      subtasks:  { select: { id: true, status: true } },
      tags:      true,
      _count:    { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
    // Канбан-доска со счётчиками по табам/колонкам → не пагинируем,
    // но ограничиваем защитным потолком (см. docs/REMEDIATION.md, п.6).
    take: SAFETY_TAKE,
  });

  return NextResponse.json(tasks);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const userId = session.user.id;
  const data = await parseBody(req, taskCreateSchema);

  const assigneeIds: string[] = data.assigneeIds?.length
    ? data.assigneeIds
    : data.assigneeId ? [data.assigneeId] : [];

  const task = await prisma.task.create({
    data: {
      title:       data.title,
      description: data.description || null,
      status:      data.status ?? "TODO",
      priority:    data.priority ?? "MEDIUM",
      dueDate:     data.dueDate ?? null,
      clientId:    data.clientId || null,
      workshopId:  data.workshopId || null,
      createdById: userId,
      assignees:   assigneeIds.length > 0 ? { connect: assigneeIds.map((id) => ({ id })) } : undefined,
    },
    include: {
      assignees: { select: { id: true, name: true, position: true, role: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
      workshop:  { select: { id: true, name: true, order: true } },
    },
  });

  const assigneeNames = task.assignees.map((a) => a.name).join(", ");
  await sendTelegram(
    `📝 <b>Новая задача</b>\n` +
    `📌 ${task.title}\n` +
    `⚡ Приоритет: ${PRIORITY_LABELS[task.priority]}\n` +
    `👤 Исполнители: ${assigneeNames || "Не назначены"}`
  );

  // Уведомление + push исполнителям (кроме самого создателя)
  await createNotifications(
    task.assignees
      .filter((a) => a.id !== userId)
      .map((a) => ({
        userId: a.id,
        type: "TASK_ASSIGNED" as const,
        title: "Назначена задача",
        body: task.title,
        link: `/tasks/${task.id}`,
      }))
  );

  return NextResponse.json(task, { status: 201 });
});
