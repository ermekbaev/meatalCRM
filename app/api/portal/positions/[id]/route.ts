import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalScope } from "@/lib/acl";
import { clientPositionCreateSchema } from "@/lib/validation";

const POSITION_SELECT = {
  id: true,
  name: true,
  unit: true,
  price: true,
  folderId: true,
  pdfKey: true,
  pdfName: true,
  createdAt: true,
} as const;

/**
 * Редактирование/удаление позиции номенклатуры — только владелец кабинета.
 * companyId проверяется через `getPortalScope` + `where.companyId`, поэтому
 * клиент не может удалить чужую запись даже подставив id.
 */
export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const { id } = await params;
  const data = await parseBody(req, clientPositionCreateSchema);

  const existing = await prisma.clientPosition.findFirst({
    where: { id, companyId },
    select: { id: true, pdfKey: true },
  });
  if (!existing) throw notFound();

  // folderId: undefined — не трогаем, null — снять, строка — переместить.
  let folderUpdate: { folderId: string | null } | {} = {};
  if (data.folderId === null) {
    folderUpdate = { folderId: null };
  } else if (data.folderId) {
    const folder = await prisma.clientPositionFolder.findFirst({
      where: { id: data.folderId, companyId },
      select: { id: true },
    });
    folderUpdate = { folderId: folder ? folder.id : null };
  }

  // Если прислали pdfKey: null — удалить старый файл из S3.
  if (data.pdfKey === null && existing.pdfKey) {
    await deleteFile(existing.pdfKey);
  }

  // Если прислали новый pdfKey и он отличается от старого — старый файл можно удалить.
  if (data.pdfKey && data.pdfKey !== existing.pdfKey && existing.pdfKey) {
    await deleteFile(existing.pdfKey);
  }

  const pdfUpdate =
    data.pdfKey !== undefined
      ? { pdfKey: data.pdfKey ?? null, pdfName: data.pdfName ?? null }
      : {};

  const updated = await prisma.clientPosition.update({
    where: { id },
    data: {
      name: data.name,
      unit: data.unit,
      price: data.price ?? null,
      ...folderUpdate,
      ...pdfUpdate,
    },
    select: POSITION_SELECT,
  });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const { id } = await params;
  const existing = await prisma.clientPosition.findFirst({
    where: { id, companyId },
    select: { id: true, pdfKey: true },
  });
  if (!existing) throw notFound();

  if (existing.pdfKey) {
    await deleteFile(existing.pdfKey);
  }

  await prisma.clientPosition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
