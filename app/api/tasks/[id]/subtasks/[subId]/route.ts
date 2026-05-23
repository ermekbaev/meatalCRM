import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { canManageSubtasks, canForemanAccessTask } from "@/lib/acl";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { subTaskUpdateSchema } from "@/lib/validation";

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, subId } = await params;
  const body = await parseBody(req, subTaskUpdateSchema);
  const role = session.user.role;
  const userId = session.user.id;

  const before = await prisma.subTask.findUnique({
    where: { id: subId },
    select: { assigneeId: true, title: true },
  });
  if (!before) throw notFound();

  if (role === "ADMIN" || role === "MANAGER") {
    // полный доступ
  } else if (role === "FOREMAN" || role === "ENGINEER") {
    if (!(await canForemanAccessTask(id, userId))) throw forbidden();
  } else if (role === "CONTRACTOR") {
    throw forbidden();
  } else {
    // EMPLOYEE: только смена статуса своей подзадачи
    if (before.assigneeId !== userId) throw forbidden();
    const allowedKeys = ["status"];
    const submittedKeys = Object.keys(body);
    if (submittedKeys.some((k) => !allowedKeys.includes(k))) throw forbidden();
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
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ?? null }),
      ...(body.order !== undefined && { order: body.order }),
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  // Уведомление при смене исполнителя
  const currentUserId = session.user.id;
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
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  const userId = session.user.id;
  if (!canManageSubtasks(role)) throw forbidden();

  const { id, subId } = await params;
  if ((role === "FOREMAN" || role === "ENGINEER") && !(await canForemanAccessTask(id, userId))) {
    throw forbidden();
  }
  await prisma.subTask.delete({ where: { id: subId } });
  return NextResponse.json({ ok: true });
});
