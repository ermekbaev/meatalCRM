import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { TASK_STATUS_LABELS } from "@/lib/utils";
import { createNotification } from "@/lib/notify";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const canSeeAllWorkshops = role === "ADMIN" || role === "MANAGER";

  const task = await prisma.task.findFirst({
    where: {
      id,
      ...(canSeeAllWorkshops ? {} : {
        OR: [
          { workshopId: null },
          { workshop: { members: { some: { id: userId } } } },
        ],
      }),
    },
    include: {
      assignee:  { select: { id: true, name: true } },
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

  const { id } = await params;
  const data = await req.json();

  const old = await prisma.task.findUnique({ where: { id }, select: { status: true, assigneeId: true } });

  const task = await prisma.task.update({
    where: { id },
    data: {
      title:       data.title,
      description: data.description ?? null,
      status:      data.status,
      priority:    data.priority,
      dueDate:     data.dueDate ? new Date(data.dueDate) : null,
      assigneeId:  data.assigneeId ?? null,
      clientId:    data.clientId ?? null,
      workshopId:  data.workshopId === undefined ? undefined : data.workshopId || null,
    },
    include: {
      assignee:  { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
      workshop:  { select: { id: true, name: true, order: true } },
    },
  });

  const currentUserId = (session.user as any).id;

  if (old && old.status !== task.status) {
    await sendTelegram(
      `🔄 <b>Статус задачи изменён</b>\n` +
      `📌 ${task.title}\n` +
      `${TASK_STATUS_LABELS[old.status] ?? old.status} → <b>${TASK_STATUS_LABELS[task.status] ?? task.status}</b>`
    );

    if (task.assigneeId && task.assigneeId !== currentUserId) {
      await createNotification({
        userId: task.assigneeId,
        type: "STATUS_CHANGED",
        title: "Статус задачи изменён",
        body: `${task.title}: ${TASK_STATUS_LABELS[old.status] ?? old.status} → ${TASK_STATUS_LABELS[task.status] ?? task.status}`,
        link: `/tasks/${id}`,
      });
    }
  }

  // Назначен новый исполнитель на задачу
  if (
    task.assigneeId &&
    task.assigneeId !== old?.assigneeId &&
    task.assigneeId !== currentUserId
  ) {
    await createNotification({
      userId: task.assigneeId,
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
