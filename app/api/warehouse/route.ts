import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { SAFETY_TAKE } from "@/lib/pagination";
import { warehouseCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  // Фасетные фильтры строятся на клиенте из полного набора → не пагинируем,
  // но ограничиваем защитным потолком (см. docs/REMEDIATION.md, п.6).
  const items = await prisma.warehouseItem.findMany({
    where: { isActive: true },
    orderBy: [{ metalType: "asc" }, { steelGrade: "asc" }, { createdAt: "asc" }],
    include: { updatedBy: { select: { id: true, name: true } } },
    take: SAFETY_TAKE,
  });

  return NextResponse.json(items);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "EMPLOYEE") throw forbidden();

  const data = await parseBody(req, warehouseCreateSchema);

  const item = await prisma.warehouseItem.create({
    data: {
      ...data,
      updatedById: session.user.id,
    },
    include: { updatedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(item, { status: 201 });
});
