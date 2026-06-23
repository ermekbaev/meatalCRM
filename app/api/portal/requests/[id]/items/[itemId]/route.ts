import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess, isPortalRequestLockedForClient } from "@/lib/acl";
import { portalRequestItemUpdateSchema } from "@/lib/validation";

async function loadItem(requestId: string, itemId: string) {
  const item = await prisma.portalRequestItem.findFirst({
    where: { id: itemId, portalRequestId: requestId },
    select: { id: true },
  });
  if (!item) throw notFound();
  return item;
}

async function checkClientLock(requestId: string, role: string) {
  if (await isPortalRequestLockedForClient(requestId, role)) {
    throw forbidden("Заявка в работе — редактирование недоступно");
  }
}

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, itemId } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();
  await checkClientLock(id, session.user.role);
  await loadItem(id, itemId);

  const data = await parseBody(req, portalRequestItemUpdateSchema);
  const updated = await prisma.portalRequestItem.update({
    where: { id: itemId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.unit !== undefined ? { unit: data.unit } : {}),
      ...(data.price !== undefined ? { price: data.price ?? null } : {}),
    },
  });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, itemId } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();
  await checkClientLock(id, session.user.role);
  await loadItem(id, itemId);

  await prisma.portalRequestItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
});
