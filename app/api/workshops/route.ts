import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { workshopCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  const userId = session.user.id;

  const workshops = await prisma.workshop.findMany({
    where: role === "ADMIN" || role === "MANAGER"
      ? {}
      : { members: { some: { id: userId } } },
    include: {
      members: {
        select: { id: true, name: true, role: true, position: true },
        orderBy: { name: "asc" },
      },
      _count: { select: { tasks: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(workshops);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN") throw forbidden();

  const { name, order, isVirtual, memberIds } = await parseBody(req, workshopCreateSchema);

  const workshop = await prisma.workshop.create({
    data: {
      name,
      order: order ?? 0,
      isVirtual: isVirtual ?? false,
      members: memberIds?.length
        ? { connect: memberIds.map((id) => ({ id })) }
        : undefined,
    },
    include: {
      members: {
        select: { id: true, name: true, role: true, position: true },
        orderBy: { name: "asc" },
      },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json(workshop, { status: 201 });
});
