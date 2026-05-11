import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { createNotification } from "@/lib/notify";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const canSeeAll = role === "ADMIN" || role === "MANAGER";

  let noWsVisibleToEmployee = false;
  if (!canSeeAll && role !== "FOREMAN") {
    const virtual = await prisma.workshop.findFirst({
      where: { isVirtual: true, members: { some: { id: userId } } },
      select: { id: true },
    });
    noWsVisibleToEmployee = !!virtual;
  }

  const task = await prisma.task.findFirst({
    where: {
      id,
      ...(canSeeAll ? {} : role === "FOREMAN" ? { assignees: { some: { id: userId } } } : {
        OR: [
          ...(noWsVisibleToEmployee ? [{ workshopId: null }] : []),
          { workshop: { members: { some: { id: userId } } } },
        ],
      }),
    },
    include: {
      assignees: { select: { id: true, name: true, position: true } },
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
      status: true,
      assignees: { select: { id: true } },
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
      ...(nextAssigneeIds !== null && {
        assignees: { set: nextAssigneeIds.map((id) => ({ id })) },
      }),
    };
  } else if (role === "FOREMAN") {
    if (!oldAssigneeIds.includes(currentUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (data.status === undefined) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    updateData = { status: data.status };
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignees: { select: { id: true, name: true, position: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
      workshop:  { select: { id: true, name: true, order: true } },
    },
  });

  const newAssigneeIds = task.assignees.map((a) => a.id);

  if (old && old.status !== task.status) {
    const columns = await prisma.taskColumn.findMany({
      where: { key: { in: [old.status, task.status] } },
      select: { key: true, name: true },
    });
    const labelMap: Record<string, string> = Object.fromEntries(columns.map((c) => [c.key, c.name]));
    const oldLabel = labelMap[old.status] ?? old.status;
    const newLabel = labelMap[task.status] ?? task.status;

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
