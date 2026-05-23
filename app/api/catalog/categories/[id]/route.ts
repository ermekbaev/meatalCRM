import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { catalogCategoryUpdateSchema } from "@/lib/validation";

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const { id } = await params;
  const { name, parentId } = await parseBody(req, catalogCategoryUpdateSchema);

  const category = await prisma.catalogCategory.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(parentId !== undefined && { parentId: parentId ?? null }),
    },
  });

  return NextResponse.json(category);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const { id } = await params;

  // Обнуляем categoryId у позиций этой категории
  await prisma.serviceCatalog.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });

  // Переносим дочерние категории на уровень родителя
  const cat = await prisma.catalogCategory.findUnique({ where: { id } });
  await prisma.catalogCategory.updateMany({
    where: { parentId: id },
    data: { parentId: cat?.parentId ?? null },
  });

  await prisma.catalogCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
