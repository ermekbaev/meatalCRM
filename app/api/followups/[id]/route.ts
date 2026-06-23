import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound, badRequest } from "@/lib/api-handler";
import { isAdminOrManager, type Role } from "@/lib/acl";
import { followUpUpdateSchema } from "@/lib/validation";
import type { Prisma } from "@prisma/client";

const followUpInclude = {
  client: { select: { id: true, name: true, shortName: true, phone: true, relationStatus: true } },
  assignee: { select: { id: true, name: true } },
  request: { select: { id: true, number: true, title: true } },
} satisfies Prisma.FollowUpInclude;

/** Загружает напоминание с проверкой прав (ADMIN — любое; MANAGER — своё). */
async function loadAccessible(id: string, role: Role, userId: string) {
  const fu = await prisma.followUp.findUnique({
    where: { id },
    select: { id: true, assigneeId: true, createdById: true, client: { select: { managerId: true } } },
  });
  if (!fu) throw notFound();
  if (role !== "ADMIN") {
    const allowed =
      fu.assigneeId === userId || fu.createdById === userId || fu.client.managerId === userId;
    if (!allowed) throw forbidden();
  }
  return fu;
}

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const role = session.user.role as Role;
  const userId = session.user.id;
  if (!isAdminOrManager(role)) throw forbidden();

  const { id } = await params;
  await loadAccessible(id, role, userId);

  const data = await parseBody(req, followUpUpdateSchema);
  const patch: Prisma.FollowUpUpdateInput = {};

  if (data.status !== undefined) {
    patch.status = data.status;
    // Закрытие — фиксируем момент; переоткрытие — снимаем отметки.
    if (data.status === "DONE") {
      patch.completedAt = new Date();
    } else if (data.status === "PENDING") {
      patch.completedAt = null;
      patch.notifiedAt = null;
    }
  }
  if (data.result !== undefined) patch.result = data.result ?? null;
  if (data.note !== undefined) patch.note = data.note?.trim() || null;
  if (data.assigneeId !== undefined) {
    patch.assignee = data.assigneeId ? { connect: { id: data.assigneeId } } : { disconnect: true };
  }
  if (data.dueDate !== undefined) {
    const due = new Date(data.dueDate);
    if (Number.isNaN(due.getTime())) throw badRequest("Некорректная дата");
    patch.dueDate = due;
    // Перенос срока → разрешаем повторный пуш на новую дату.
    patch.notifiedAt = null;
  }

  const updated = await prisma.followUp.update({
    where: { id },
    data: patch,
    include: followUpInclude,
  });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const role = session.user.role as Role;
  const userId = session.user.id;
  if (!isAdminOrManager(role)) throw forbidden();

  const { id } = await params;
  await loadAccessible(id, role, userId);
  await prisma.followUp.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
