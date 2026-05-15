import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { createNotification } from "@/lib/notify";
import { PRIORITY_LABELS, TASK_PRODUCTION_FIELDS, formatDate } from "@/lib/utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const canSeeAll = role === "ADMIN" || role === "MANAGER";

  const isAssigneeRole = role === "FOREMAN" || role === "ENGINEER" || role === "CONTRACTOR";

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
          ...(noWsVisibleToEmployee ? [{ workshopId: null }] : []),
          { workshop: { members: { some: { id: userId } } } },
        ],
      }),
    },
    include: {
      assignees: { select: { id: true, name: true, position: true, role: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
      workshop:  { select: { id: true, name: true, order: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, position: true } } },
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

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const currentUserId = (session.user as any).id;

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
      laserStatus: true,
      bendingStatus: true,
      paintingStatus: true,
      sandblastingStatus: true,
      assignees: { select: { id: true, name: true } },
    },
  });
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    updateData = {
      title:       data.title,
      description: data.description ?? null,
      status:      data.status,
      priority:    data.priority,
      dueDate:     data.dueDate ? new Date(data.dueDate) : null,
      clientId:    data.clientId ?? null,
      workshopId:  data.workshopId === undefined ? undefined : data.workshopId || null,
      ...(data.laserStatus        !== undefined && { laserStatus:        data.laserStatus        || null }),
      ...(data.bendingStatus      !== undefined && { bendingStatus:      data.bendingStatus      || null }),
      ...(data.paintingStatus     !== undefined && { paintingStatus:     data.paintingStatus     || null }),
      ...(data.sandblastingStatus !== undefined && { sandblastingStatus: data.sandblastingStatus || null }),
      ...(nextAssigneeIds !== null && {
        assignees: { set: nextAssigneeIds.map((id) => ({ id })) },
      }),
    };
  } else if (role === "FOREMAN" || role === "ENGINEER") {
    if (!oldAssigneeIds.includes(currentUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const productionPatch: any = {};
    for (const k of ["laserStatus", "bendingStatus", "paintingStatus", "sandblastingStatus"] as const) {
      if (data[k] !== undefined) productionPatch[k] = data[k] || null;
    }
    if (data.status === undefined && Object.keys(productionPatch).length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    updateData = { ...(data.status !== undefined && { status: data.status }), ...productionPatch };
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignees: { select: { id: true, name: true, position: true, role: true } },
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
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
