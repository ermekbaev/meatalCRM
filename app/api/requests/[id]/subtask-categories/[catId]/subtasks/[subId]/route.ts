import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
  done: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const { id, catId, subId } = await params;
  const sub = await prisma.requestSubtask.findFirst({
    where: { id: subId, categoryId: catId, category: { requestId: id } },
    select: { id: true, category: { select: { request: { select: { lockedAt: true } } } } },
  });
  if (!sub) throw notFound();
  if (role === "MANAGER" && sub.category.request.lockedAt) throw forbidden("Заявка заблокирована.");

  const data = await parseBody(req, schema);
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.done !== undefined) patch.done = data.done;
  if (data.archived !== undefined) patch.archivedAt = data.archived ? new Date() : null;

  const updated = await prisma.requestSubtask.update({ where: { id: subId }, data: patch });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const { id, catId, subId } = await params;
  const sub = await prisma.requestSubtask.findFirst({
    where: { id: subId, categoryId: catId, category: { requestId: id } },
    select: { id: true, category: { select: { request: { select: { lockedAt: true } } } } },
  });
  if (!sub) throw notFound();
  if (role === "MANAGER" && sub.category.request.lockedAt) throw forbidden("Заявка заблокирована.");

  await prisma.requestSubtask.delete({ where: { id: subId } });
  return NextResponse.json({ ok: true });
});
