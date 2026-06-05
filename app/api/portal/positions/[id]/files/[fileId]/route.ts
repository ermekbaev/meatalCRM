import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalScope } from "@/lib/acl";

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const { id, fileId } = await params;

  const file = await prisma.clientPositionFile.findFirst({
    where: { id: fileId, positionId: id, position: { companyId } },
    select: { id: true, filename: true },
  });
  if (!file) throw notFound();

  await prisma.clientPositionFile.delete({ where: { id: fileId } });
  await deleteFile(file.filename).catch(() => {});

  return NextResponse.json({ ok: true });
});
