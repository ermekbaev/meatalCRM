import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { canManageSubtasks, canForemanAccessTask } from "@/lib/acl";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, subId } = await params;
  const body = await req.json();
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const before = await prisma.subTask.findUnique({
    where: { id: subId },
    select: { assigneeId: true, title: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role === "ADMIN" || role === "MANAGER") {
    // полный доступ
  } else if (role === "FOREMAN" || role === "ENGINEER") {
    if (!(await canForemanAccessTask(id, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    // EMPLOYEE: только смена статуса своей подзадачи
    if (before.assigneeId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const allowedKeys = ["status"];
    const submittedKeys = Object.keys(body);
    if (submittedKeys.some((k) => !allowedKeys.includes(k))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const item = await prisma.subTask.update({
    where: { id: subId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.unit !== undefined && { unit: body.unit || null }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId || null }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.order !== undefined && { order: body.order }),
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  // Уведомление при смене исполнителя
  const currentUserId = (session.user as any).id;
  if (
    body.assigneeId !== undefined &&
    item.assigneeId &&
    item.assigneeId !== before?.assigneeId &&
    item.assigneeId !== currentUserId
  ) {
    const task = await prisma.task.findUnique({ where: { id }, select: { title: true } });
    await createNotification({
      userId: item.assigneeId,
      type: "SUBTASK_ASSIGNED",
      title: "Назначена подзадача",
      body: `${item.title}${task ? ` · ${task.title}` : ""}`,
      link: `/tasks/${id}`,
    });
  }

  return NextResponse.json(item);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  if (!canManageSubtasks(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, subId } = await params;
  if ((role === "FOREMAN" || role === "ENGINEER") && !(await canForemanAccessTask(id, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.subTask.delete({ where: { id: subId } });
  return NextResponse.json({ ok: true });
}
