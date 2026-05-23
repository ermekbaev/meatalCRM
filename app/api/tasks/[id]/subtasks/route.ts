import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { canManageSubtasks, canForemanAccessTask } from "@/lib/acl";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { subTaskCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const items = await prisma.subTask.findMany({
    where: { taskId: id },
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  const userId = session.user.id;
  if (!canManageSubtasks(role)) throw forbidden();

  const { id } = await params;
  if ((role === "FOREMAN" || role === "ENGINEER") && !(await canForemanAccessTask(id, userId))) {
    throw forbidden();
  }
  const body = await parseBody(req, subTaskCreateSchema);

  const count = await prisma.subTask.count({ where: { taskId: id } });

  const item = await prisma.subTask.create({
    data: {
      taskId: id,
      title: body.title,
      quantity: body.quantity ?? null,
      unit: body.unit || null,
      priority: body.priority ?? "MEDIUM",
      status: body.status ?? "TODO",
      assigneeId: body.assigneeId || null,
      dueDate: body.dueDate ?? null,
      order: count,
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  // Уведомление исполнителю (не себе)
  const currentUserId = session.user.id;
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
});
