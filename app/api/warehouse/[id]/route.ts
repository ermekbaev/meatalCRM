import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { warehouseCreateSchema } from "@/lib/validation";

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "EMPLOYEE") throw forbidden();

  const { id } = await params;
  const data = await parseBody(req, warehouseCreateSchema);

  const item = await prisma.warehouseItem.update({
    where: { id },
    data: {
      ...data,
      updatedById: session.user.id,
    },
    include: { updatedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(item);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "EMPLOYEE") throw forbidden();

  const { id } = await params;
  await prisma.warehouseItem.update({
    where: { id },
    data: {
      isActive: false,
      updatedById: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
});
