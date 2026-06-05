import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
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

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const positions = await prisma.clientPosition.findMany({
    where: { companyId },
    select: POSITION_SELECT,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(positions);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const data = await parseBody(req, clientPositionCreateSchema);

  let folderId: string | null = null;
  if (data.folderId) {
    const folder = await prisma.clientPositionFolder.findFirst({
      where: { id: data.folderId, companyId },
      select: { id: true },
    });
    if (folder) folderId = folder.id;
  }

  const position = await prisma.clientPosition.create({
    data: { companyId, name: data.name, unit: data.unit, price: data.price ?? null, folderId },
    select: POSITION_SELECT,
  });
  return NextResponse.json(position, { status: 201 });
});
