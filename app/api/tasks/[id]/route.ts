import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { createNotification } from "@/lib/notify";
import { PRIORITY_LABELS, TASK_PRODUCTION_FIELDS, formatDate } from "@/lib/utils";
import { deleteFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden, notFound } from "@/lib/api-handler";

export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;
  // Конструктор (ENGINEER) видит все задачи (в т.ч. где он отмечен исполнителем).
  const canSeeAll = role === "ADMIN" || role === "MANAGER" || role === "ENGINEER";

  const isAssigneeRole = role === "FOREMAN" || role === "CONTRACTOR";

  let noWsVisibleToEmployee = false;
  if (!canSeeAll && !isAssigneeRole) {
    const virtual = await prisma.workshop.findFirst({
      where: { isVirtual: true, members: { some: { id: userId } } },
      select: { id: true },
    });
    noWsVisibleToEmployee = !!virtual;
  }

  const task = await prisma.task.findFirst({
    where: {
      id,
      ...(canSeeAll ? {} : isAssigneeRole ? { assignees: { some: { id: userId } } } : {
        OR: [
          { assignees: { some: { id: userId } } },
          ...(noWsVisibleToEmployee ? [{ workshopId: null }] : []),
          { workshop: { members: { some: { id: userId } } } },
        ],
      }),
    },
    include: {
      assignees: { select: { id: true, name: true, position: true, role: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
      workshop:  { select: { id: true, name: true, order: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, position: true, avatarUrl: true } } },
      },
      files: {
        orderBy: { createdAt: "asc" },
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
      checklist: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      subtasks: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { assignee: { select: { id: true, name: true } } },
      },
      tags: true,
      changeLogs: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, position: true } } },
      },
    },
  });

  if (!task) throw notFound();
  return NextResponse.json(task);
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  const currentUserId = session.user.id;

  const { id } = await params;
  const data = await req.json();

  const old = await prisma.task.findUnique({
    where: { id },
    select: {
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      workshopId: true,
      ...Object.fromEntries(TASK_PRODUCTION_FIELDS.map((f) => [f.key, true])),
      assignees: { select: { id: true, name: true } },
    },
  });
  if (!old) throw notFound();
  const oldAssigneeIds = old.assignees.map((a) => a.id);

  let updateData: any;
  let nextAssigneeIds: string[] | null = null;
  if (role === "ADMIN" || role === "MANAGER") {
    if (Array.isArray(data.assigneeIds)) {
      nextAssigneeIds = data.assigneeIds.filter((x: any) => typeof x === "string" && x);
    } else if (data.assigneeId !== undefined) {
      // обратная совместимость со старыми клиентами
      nextAssigneeIds = data.assigneeId ? [data.assigneeId] : [];
    }
    const productionPatch: any = {};
    for (const f of TASK_PRODUCTION_FIELDS) {
      if (data[f.key] !== undefined) productionPatch[f.key] = data[f.key] || null;
    }
    // archivedAt: null — вернуть из архива; ISO/Date — отправить в архив; undefined — не трогать
    let archivedAtPatch: { archivedAt: Date | null } | undefined;
    if (data.archivedAt !== undefined) {
      archivedAtPatch = { archivedAt: data.archivedAt ? new Date(data.archivedAt) : null };
    }
    updateData = {
      title:       data.title,
      description: data.description ?? null,
      status:      data.status,
      priority:    data.priority,
      dueDate:     data.dueDate ? new Date(data.dueDate) : null,
      clientId:    data.clientId ?? null,
      workshopId:  data.workshopId === undefined ? undefined : data.workshopId || null,
      ...productionPatch,
      ...(archivedAtPatch ?? {}),
      ...(nextAssigneeIds !== null && {
        assignees: { set: nextAssigneeIds.map((id) => ({ id })) },
      }),
    };
  } else if (role === "FOREMAN" || role === "ENGINEER" || role === "EMPLOYEE") {
    // Мастер/инженер/оператор могут менять статус и статусы производства
    // только в задачах, где они отмечены исполнителем.
    if (!oldAssigneeIds.includes(currentUserId)) throw forbidden();
    const productionPatch: any = {};
    for (const f of TASK_PRODUCTION_FIELDS) {
      if (data[f.key] !== undefined) productionPatch[f.key] = data[f.key] || null;
    }
    if (data.status === undefined && Object.keys(productionPatch).length === 0) {
      throw forbidden();
    }
    updateData = { ...(data.status !== undefined && { status: data.status }), ...productionPatch };
  } else {
    throw forbidden();
  }

  // Если задача уходит из статуса DONE — вытащим её из архива автоматически.
  // Иначе перетаскивание архивной задачи обратно в «В работе» оставило бы
  // её невидимой в обычном листинге (archivedAt всё ещё проставлен).
  if (
    updateData.status !== undefined &&
    updateData.status !== "DONE" &&
    old.status === "DONE" &&
    updateData.archivedAt === undefined
  ) {
    updateData.archivedAt = null;
  }

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignees: { select: { id: true, name: true, position: true, role: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
      workshop:  { select: { id: true, name: true, order: true } },
    },
  });

  const newAssigneeIds = task.assignees.map((a) => a.id);

  // --- История изменений ---
  const changeLogEntries: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  if (old.status !== task.status) {
    const columns = await prisma.taskColumn.findMany({
      where: { key: { in: [old.status, task.status] } },
      select: { key: true, name: true },
    });
    const labelMap: Record<string, string> = Object.fromEntries(columns.map((c) => [c.key, c.name]));
    const oldLabel = labelMap[old.status] ?? old.status;
    const newLabel = labelMap[task.status] ?? task.status;

    changeLogEntries.push({ field: "status", oldValue: oldLabel, newValue: newLabel });

    await sendTelegram(
      `🔄 <b>Статус задачи изменён</b>\n` +
      `📌 ${task.title}\n` +
      `${oldLabel} → <b>${newLabel}</b>`
    );

    for (const a of task.assignees) {
      if (a.id === currentUserId) continue;
      await createNotification({
        userId: a.id,
        type: "STATUS_CHANGED",
        title: "Статус задачи изменён",
        body: `${task.title}: ${oldLabel} → ${newLabel}`,
        link: `/tasks/${id}`,
      });
    }
  }

  if (old.title !== task.title) {
    changeLogEntries.push({ field: "title", oldValue: old.title, newValue: task.title });
  }

  if (old.priority !== task.priority) {
    changeLogEntries.push({
      field: "priority",
      oldValue: PRIORITY_LABELS[old.priority] ?? old.priority,
      newValue: PRIORITY_LABELS[task.priority] ?? task.priority,
    });
  }

  const oldDue = old.dueDate ? formatDate(old.dueDate) : "";
  const newDue = task.dueDate ? formatDate(task.dueDate) : "";
  if (oldDue !== newDue) {
    changeLogEntries.push({ field: "dueDate", oldValue: oldDue || null, newValue: newDue || null });
  }

  if ((old.workshopId ?? null) !== (task.workshopId ?? null)) {
    let oldWsName = "";
    if (old.workshopId) {
      const ws = await prisma.workshop.findUnique({ where: { id: old.workshopId }, select: { name: true } });
      oldWsName = ws?.name ?? "";
    }
    changeLogEntries.push({
      field: "workshop",
      oldValue: oldWsName || null,
      newValue: task.workshop?.name ?? null,
    });
  }

  for (const f of TASK_PRODUCTION_FIELDS) {
    const ov = (old as any)[f.key] ?? null;
    const nv = (task as any)[f.key] ?? null;
    if (ov !== nv) {
      changeLogEntries.push({
        field: f.key,
        oldValue: ov ? (f.options.find((o) => o.value === ov)?.label ?? ov) : null,
        newValue: nv ? (f.options.find((o) => o.value === nv)?.label ?? nv) : null,
      });
    }
  }

  const oldAssById = new Map(old.assignees.map((a) => [a.id, a.name]));
  const newAssById = new Map(task.assignees.map((a) => [a.id, a.name]));
  for (const [aid, name] of newAssById) {
    if (!oldAssById.has(aid)) changeLogEntries.push({ field: "assignee", oldValue: null, newValue: name });
  }
  for (const [aid, name] of oldAssById) {
    if (!newAssById.has(aid)) changeLogEntries.push({ field: "assignee", oldValue: name, newValue: null });
  }

  if (changeLogEntries.length > 0) {
    await prisma.taskChangeLog.createMany({
      data: changeLogEntries.map((c) => ({ ...c, taskId: id, userId: currentUserId })),
    });
  }

  // Уведомление только вновь добавленным исполнителям
  const addedAssigneeIds = newAssigneeIds.filter((uid) => !oldAssigneeIds.includes(uid));
  for (const uid of addedAssigneeIds) {
    if (uid === currentUserId) continue;
    await createNotification({
      userId: uid,
      type: "TASK_ASSIGNED",
      title: "Назначена задача",
      body: task.title,
      link: `/tasks/${id}`,
    });
  }

  return NextResponse.json(task);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const { id } = await params;

  // Удаляем файлы из S3 до удаления записи (CASCADE чистит только БД, не S3)
  const files = await prisma.taskFile.findMany({ where: { taskId: id }, select: { filename: true } });
  await Promise.allSettled(files.map((f) => deleteFile(f.filename)));

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
