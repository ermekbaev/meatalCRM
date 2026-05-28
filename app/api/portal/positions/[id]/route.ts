import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalScope } from "@/lib/acl";
import { clientPositionCreateSchema } from "@/lib/validation";

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
    select: { id: true },
  });
  if (!existing) throw notFound();

  // folderId: undefined — не трогаем, null — снять, строка — переместить.
  // Проверяем, что folder принадлежит той же компании.
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

  const updated = await prisma.clientPosition.update({
    where: { id },
    data: {
      name: data.name,
      unit: data.unit,
      price: data.price ?? null,
      ...folderUpdate,
    },
    select: { id: true, name: true, unit: true, price: true, folderId: true, createdAt: true },
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
    select: { id: true },
  });
  if (!existing) throw notFound();

  await prisma.clientPosition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
