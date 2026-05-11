import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { canManageSubtasks, canForemanAccessTask } from "@/lib/acl";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const items = await prisma.subTask.findMany({
    where: { taskId: id },
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  if (!canManageSubtasks(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if ((role === "FOREMAN" || role === "ENGINEER") && !(await canForemanAccessTask(id, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });

  const count = await prisma.subTask.count({ where: { taskId: id } });

  const item = await prisma.subTask.create({
    data: {
      taskId: id,
      title: body.title.trim(),
      quantity: body.quantity ?? null,
      unit: body.unit?.trim() || null,
      priority: body.priority ?? "MEDIUM",
      status: body.status ?? "TODO",
      assigneeId: body.assigneeId || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      order: count,
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  // Уведомление исполнителю (не себе)
  const currentUserId = (session.user as any).id;
  if (item.assigneeId && item.assigneeId !== currentUserId) {
    const task = await prisma.task.findUnique({ where: { id }, select: { title: true } });
    await createNotification({
      userId: item.assigneeId,
      type: "SUBTASK_ASSIGNED",
      title: "Назначена подзадача",
      body: `${item.title}${task ? ` · ${task.title}` : ""}`,
      link: `/tasks/${id}`,
    });
  }

  return NextResponse.json(item, { status: 201 });
}
