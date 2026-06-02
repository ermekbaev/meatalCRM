import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
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

async function checkAccess(companyId: string, session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>) {
  if (!session) return false;
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") return false;
  const company = await prisma.client.findFirst({
    where: { id: companyId, ...(role === "MANAGER" ? { managerId: session.user.id } : {}) },
    select: { id: true },
  });
  return company !== null;
}

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const { id: companyId, positionId } = await params;
  if (!(await checkAccess(companyId, session))) throw forbidden();

  const data = await parseBody(req, clientPositionCreateSchema);

  const existing = await prisma.clientPosition.findFirst({
    where: { id: positionId, companyId },
    select: { id: true },
  });
  if (!existing) throw notFound();

  let folderUpdate: { folderId: string | null } | Record<string, never> = {};
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
    where: { id: positionId },
    data: { name: data.name, unit: data.unit, price: data.price ?? null, ...folderUpdate },
    select: POSITION_SELECT,
  });
  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const { id: companyId, positionId } = await params;
  if (!(await checkAccess(companyId, session))) throw forbidden();

  const existing = await prisma.clientPosition.findFirst({
    where: { id: positionId, companyId },
    select: { id: true, pdfKey: true },
  });
  if (!existing) throw notFound();

  if (existing.pdfKey) await deleteFile(existing.pdfKey);
  await prisma.clientPosition.delete({ where: { id: positionId } });
  return NextResponse.json({ ok: true });
});
