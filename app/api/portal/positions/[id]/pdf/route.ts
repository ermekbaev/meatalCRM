import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getViewUrl, deleteFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalScope } from "@/lib/acl";

/** Находит позицию с учётом роли: CLIENT — только своей компании, ADMIN — любую, MANAGER — своих компаний. */
async function findPosition(id: string, session: NonNullable<Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>>) {
  const role = session.user.role;

  if (role === "CLIENT") {
    const companyId = getPortalScope(session);
    if (!companyId) return null;
    return prisma.clientPosition.findFirst({
      where: { id, companyId },
      select: { id: true, pdfKey: true },
    });
  }
  if (role === "ADMIN") {
    return prisma.clientPosition.findFirst({
      where: { id },
      select: { id: true, pdfKey: true },
    });
  }
  if (role === "MANAGER") {
    return prisma.clientPosition.findFirst({
      where: { id, company: { managerId: session.user.id } },
      select: { id: true, pdfKey: true },
    });
  }
  return null;
}

/** Возвращает presigned URL для просмотра PDF в браузере (15 мин). */
export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const position = await findPosition(id, session);
  if (!position) throw notFound();
  if (!position.pdfKey) throw notFound();

  const url = await getViewUrl(position.pdfKey, 3600, true);
  return NextResponse.json({ url });
});

/** Удаляет прикреплённый PDF из позиции и из S3. Только CLIENT (владелец). */
export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const { id } = await params;
  const position = await prisma.clientPosition.findFirst({
    where: { id, companyId },
    select: { id: true, pdfKey: true },
  });
  if (!position) throw notFound();

  if (position.pdfKey) {
    await deleteFile(position.pdfKey);
  }

  const updated = await prisma.clientPosition.update({
    where: { id },
    data: { pdfKey: null, pdfName: null },
    select: { id: true, name: true, unit: true, price: true, folderId: true, pdfKey: true, pdfName: true, createdAt: true },
  });
  return NextResponse.json(updated);
});
