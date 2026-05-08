import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, subId } = await params;
  const body = await req.json();

  const before = await prisma.subTask.findUnique({
    where: { id: subId },
    select: { assigneeId: true, title: true },
  });

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

  const { subId } = await params;
  await prisma.subTask.delete({ where: { id: subId } });
  return NextResponse.json({ ok: true });
}
