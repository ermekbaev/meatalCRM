import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess, isPortalRequestLockedForClient } from "@/lib/acl";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
  done: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, catId, subId } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();
  if (await isPortalRequestLockedForClient(id, session.user.role)) {
    throw forbidden("Заявка в работе — редактирование недоступно");
  }

  const sub = await prisma.portalRequestSubtask.findFirst({
    where: { id: subId, categoryId: catId, category: { portalRequestId: id } },
    select: { id: true },
  });
  if (!sub) throw notFound();

  const data = await parseBody(req, schema);
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.done !== undefined) patch.done = data.done;
  if (data.archived !== undefined) patch.archivedAt = data.archived ? new Date() : null;

  const updated = await prisma.portalRequestSubtask.update({ where: { id: subId }, data: patch });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, catId, subId } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();
  if (await isPortalRequestLockedForClient(id, session.user.role)) {
    throw forbidden("Заявка в работе — редактирование недоступно");
  }

  const sub = await prisma.portalRequestSubtask.findFirst({
    where: { id: subId, categoryId: catId, category: { portalRequestId: id } },
    select: { id: true },
  });
  if (!sub) throw notFound();

  await prisma.portalRequestSubtask.delete({ where: { id: subId } });
  return NextResponse.json({ ok: true });
});
