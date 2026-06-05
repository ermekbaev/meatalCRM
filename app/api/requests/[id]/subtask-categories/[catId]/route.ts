import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  archived: z.boolean().optional(),
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const { id, catId } = await params;
  const cat = await prisma.requestSubtaskCategory.findFirst({
    where: { id: catId, requestId: id },
    select: { id: true, request: { select: { lockedAt: true } } },
  });
  if (!cat) throw notFound();
  if (role === "MANAGER" && cat.request.lockedAt) throw forbidden("Заявка заблокирована.");

  const data = await parseBody(req, schema);
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.archived !== undefined) patch.archivedAt = data.archived ? new Date() : null;

  const updated = await prisma.requestSubtaskCategory.update({
    where: { id: catId },
    data: patch,
    include: { subtasks: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const { id, catId } = await params;
  const cat = await prisma.requestSubtaskCategory.findFirst({
    where: { id: catId, requestId: id },
    select: { id: true, request: { select: { lockedAt: true } } },
  });
  if (!cat) throw notFound();
  if (role === "MANAGER" && cat.request.lockedAt) throw forbidden("Заявка заблокирована.");

  await prisma.requestSubtaskCategory.delete({ where: { id: catId } });
  return NextResponse.json({ ok: true });
});
