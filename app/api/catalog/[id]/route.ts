import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { serviceCatalogUpdateSchema } from "@/lib/validation";

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const { id } = await params;
  const data = await parseBody(req, serviceCatalogUpdateSchema);

  const updateData: Prisma.ServiceCatalogUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description ?? null;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.category !== undefined) updateData.category = data.category ?? null;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.price !== undefined) updateData.price = data.price ?? null;
  if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice ?? null;
  if (data.categoryId !== undefined) {
    updateData.catalogCategory = data.categoryId
      ? { connect: { id: data.categoryId } }
      : { disconnect: true };
  }

  const item = await prisma.serviceCatalog.update({
    where: { id },
    data: updateData,
    include: { catalogCategory: { select: { id: true, name: true, parentId: true } } },
  });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const { id } = await params;
  await prisma.serviceCatalog.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
});
