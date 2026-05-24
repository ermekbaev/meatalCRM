import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { getPortalScope } from "@/lib/acl";
import { clientPositionCreateSchema } from "@/lib/validation";

/**
 * Номенклатура клиента (CRUD только у CLIENT для своей компании).
 * Внутренние видят список через server-page карточки компании,
 * редактирование — на стороне клиента.
 */
export const GET = withErrorHandling(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const positions = await prisma.clientPosition.findMany({
    where: { companyId },
    select: { id: true, name: true, unit: true, createdAt: true },
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

  const position = await prisma.clientPosition.create({
    data: { companyId, name: data.name, unit: data.unit },
    select: { id: true, name: true, unit: true, createdAt: true },
  });
  return NextResponse.json(position, { status: 201 });
});
