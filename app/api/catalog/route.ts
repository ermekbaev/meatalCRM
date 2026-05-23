import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { SAFETY_TAKE } from "@/lib/pagination";
import { serviceCatalogCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  // Reference-данные (селекты, калькулятор, дерево категорий) → не пагинируем,
  // но ограничиваем защитным потолком (см. docs/REMEDIATION.md, п.6).
  const items = await prisma.serviceCatalog.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    include: { catalogCategory: { select: { id: true, name: true, parentId: true } } },
    take: SAFETY_TAKE,
  });

  return NextResponse.json(items);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const data = await parseBody(req, serviceCatalogCreateSchema);
  const item = await prisma.serviceCatalog.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      unit: data.unit,
      price: data.price ?? null,
      category: data.category ?? null,
      type: data.type,
      categoryId: data.categoryId ?? null,
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      purchasePrice: data.purchasePrice ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
});
