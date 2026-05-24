import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, notFound, forbidden } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";

/**
 * Удаление файла портальной заявки.
 *  - CLIENT — только свой файл (uploadedById === user.id) в заявке своей компании.
 *  - ADMIN — любой.
 *  - MANAGER — любой файл в заявках своих компаний.
 */
export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, fileId } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const file = await prisma.portalFile.findFirst({
    where: { id: fileId, portalRequestId: id },
    select: { id: true, filename: true, uploadedById: true },
  });
  if (!file) throw notFound();

  if (session.user.role === "CLIENT" && file.uploadedById !== session.user.id) {
    throw forbidden();
  }

  await deleteFile(file.filename);
  await prisma.portalFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
});
