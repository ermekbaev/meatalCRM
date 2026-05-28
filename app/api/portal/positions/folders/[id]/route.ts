import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalScope } from "@/lib/acl";
import { clientPositionFolderSchema } from "@/lib/validation";

/**
 * Папка номенклатуры клиента. При удалении папки позиции остаются — у них
 * folderId сбрасывается в NULL (ON DELETE SET NULL в миграции).
 */
export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const { id } = await params;
  const data = await parseBody(req, clientPositionFolderSchema);

  const existing = await prisma.clientPositionFolder.findFirst({
    where: { id, companyId },
    select: { id: true },
  });
  if (!existing) throw notFound();

  const updated = await prisma.clientPositionFolder.update({
    where: { id },
    data: { name: data.name },
    select: { id: true, name: true, createdAt: true },
  });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const { id } = await params;
  const existing = await prisma.clientPositionFolder.findFirst({
    where: { id, companyId },
    select: { id: true },
  });
  if (!existing) throw notFound();

  await prisma.clientPositionFolder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
