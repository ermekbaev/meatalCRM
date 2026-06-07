import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized, forbidden, badRequest } from "@/lib/api-handler";

// Детализация по позиции (услуга/товар): завершённые заявки, где встречается позиция,
// с количеством и суммой именно по этой позиции. По аналогии с manager-requests.
export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") throw forbidden();

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!name) throw badRequest("name обязателен");

  const dateFilter = {
    ...(from && { gte: new Date(from) }),
    ...(to && { lte: new Date(to + "T23:59:59.999Z") }),
  };
  const dateWhere = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  const rows = await prisma.request.findMany({
    where: { status: "COMPLETED", ...dateWhere, items: { some: { name } } },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      priority: true,
      amount: true,
      createdAt: true,
      updatedAt: true,
      client: { select: { id: true, name: true } },
      // только строки этой позиции
      items: { where: { name }, select: { quantity: true, total: true, purchasePrice: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Свёртка по заявке: суммарное кол-во и выручка/прибыль именно по этой позиции
  const requests = rows.map((r) => {
    const qty = r.items.reduce((s, it) => s + it.quantity, 0);
    const revenue = r.items.reduce((s, it) => s + (it.total ?? 0), 0);
    const cost = r.items.reduce((s, it) => s + (it.purchasePrice != null ? it.purchasePrice * it.quantity : 0), 0);
    const hasCost = r.items.some((it) => it.purchasePrice != null);
    return {
      id: r.id,
      number: r.number,
      title: r.title,
      status: r.status,
      priority: r.priority,
      amount: r.amount,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      client: r.client,
      itemQuantity: qty,
      itemRevenue: revenue,
      itemProfit: hasCost ? revenue - cost : null,
    };
  });

  const totals = {
    orders: requests.length,
    quantity: requests.reduce((s, r) => s + r.itemQuantity, 0),
    revenue: requests.reduce((s, r) => s + r.itemRevenue, 0),
  };

  return NextResponse.json({ name, totals, requests });
});
