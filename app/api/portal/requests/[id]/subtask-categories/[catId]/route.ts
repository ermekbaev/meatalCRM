import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess, isPortalRequestLockedForClient } from "@/lib/acl";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  archived: z.boolean().optional(),
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, catId } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();
  if (await isPortalRequestLockedForClient(id, session.user.role)) {
    throw forbidden("Заявка в работе — редактирование недоступно");
  }

  const cat = await prisma.portalRequestSubtaskCategory.findFirst({
    where: { id: catId, portalRequestId: id },
    select: { id: true },
  });
  if (!cat) throw notFound();

  const data = await parseBody(req, schema);
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.archived !== undefined) patch.archivedAt = data.archived ? new Date() : null;

  const updated = await prisma.portalRequestSubtaskCategory.update({
    where: { id: catId },
    data: patch,
    include: { subtasks: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, catId } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();
  if (await isPortalRequestLockedForClient(id, session.user.role)) {
    throw forbidden("Заявка в работе — редактирование недоступно");
  }

  const cat = await prisma.portalRequestSubtaskCategory.findFirst({
    where: { id: catId, portalRequestId: id },
    select: { id: true },
  });
  if (!cat) throw notFound();

  await prisma.portalRequestSubtaskCategory.delete({ where: { id: catId } });
  return NextResponse.json({ ok: true });
});
