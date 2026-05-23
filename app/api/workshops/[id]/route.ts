import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { withErrorHandling, parseBody, unauthorized, forbidden, badRequest } from "@/lib/api-handler";
import { workshopUpdateSchema } from "@/lib/validation";

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const { id } = await params;
  const data = await parseBody(req, workshopUpdateSchema);
  const updateData: Prisma.WorkshopUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.memberIds !== undefined) {
    updateData.members = { set: data.memberIds.map((memberId) => ({ id: memberId })) };
  }

  const workshop = await prisma.workshop.update({
    where: { id },
    data: updateData,
    include: {
      members: {
        select: { id: true, name: true, role: true, position: true },
        orderBy: { name: "asc" },
      },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json(workshop);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const { id } = await params;
  const existing = await prisma.workshop.findUnique({ where: { id }, select: { isVirtual: true } });
  if (existing?.isVirtual) throw badRequest("Виртуальный цех удалить нельзя");

  await prisma.workshop.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
