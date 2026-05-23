import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound, badRequest } from "@/lib/api-handler";
import { taskColumnUpdateSchema } from "@/lib/validation";

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const { id } = await params;
  const data = await parseBody(req, taskColumnUpdateSchema);

  const updateData: { name?: string; color?: string; order?: number } = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.order !== undefined) updateData.order = data.order;

  const column = await prisma.taskColumn.update({ where: { id }, data: updateData });
  return NextResponse.json(column);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const { id } = await params;
  const column = await prisma.taskColumn.findUnique({ where: { id } });
  if (!column) throw notFound();
  if (column.isSystem) throw badRequest("Нельзя удалить системную колонку");

  // Переносим задачи из этой колонки в TODO
  await prisma.task.updateMany({
    where: { status: column.key },
    data: { status: "TODO" },
  });
  await prisma.taskColumn.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
