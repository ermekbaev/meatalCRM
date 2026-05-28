import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { getPortalScope } from "@/lib/acl";
import { clientPositionFolderSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const folders = await prisma.clientPositionFolder.findMany({
    where: { companyId },
    select: { id: true, name: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(folders);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const data = await parseBody(req, clientPositionFolderSchema);

  const folder = await prisma.clientPositionFolder.create({
    data: { companyId, name: data.name },
    select: { id: true, name: true, createdAt: true },
  });
  return NextResponse.json(folder, { status: 201 });
});
