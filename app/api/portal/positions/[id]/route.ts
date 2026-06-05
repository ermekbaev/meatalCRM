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
  createdAt: true,
  files: { select: { id: true, filename: true, originalName: true, size: true, kind: true }, orderBy: { createdAt: "asc" as const } },
} as const;

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const { id } = await params;
  const data = await parseBody(req, clientPositionCreateSchema);

  const existing = await prisma.clientPosition.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) throw notFound();

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
    data: { name: data.name, unit: data.unit, price: data.price ?? null, ...folderUpdate },
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
    select: { id: true, files: { select: { filename: true } } },
  });
  if (!existing) throw notFound();

  for (const f of existing.files) {
    await deleteFile(f.filename).catch(() => {});
  }

  await prisma.clientPosition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
