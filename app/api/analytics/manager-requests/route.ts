import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized, forbidden, badRequest } from "@/lib/api-handler";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") throw forbidden();

  const { searchParams } = new URL(req.url);
  const assigneeId = searchParams.get("assigneeId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!assigneeId) throw badRequest("assigneeId обязателен");

  const dateFilter = {
    ...(from && { gte: new Date(from) }),
    ...(to && { lte: new Date(to + "T23:59:59.999Z") }),
  };
  const dateWhere = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  // assigneeId "__none__" — заявки без назначенного менеджера
  const assigneeWhere =
    assigneeId === "__none__"
      ? { assigneeId: null }
      : { assigneeId };

  const [requests, manager] = await Promise.all([
    prisma.request.findMany({
      where: { ...dateWhere, ...assigneeWhere },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        priority: true,
        amount: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
        items: { select: { name: true, quantity: true, total: true, purchasePrice: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    assigneeId !== "__none__"
      ? prisma.user.findUnique({
          where: { id: assigneeId },
          select: { id: true, name: true, email: true, position: true },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ manager, requests });
});
