import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized } from "@/lib/api-handler";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter = {
    ...(from && { gte: new Date(from) }),
    ...(to && { lte: new Date(to + "T23:59:59.999Z") }),
  };
  const where = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  // Все запросы — параллельно в одном батче.
  // completedWithItems включает name позиций — заменяет отдельный запрос serviceItems.
  // allRequests содержит все статусы — заменяет отдельный count и источник для менеджеров.
  const [
    completedWithItems,
    allRequests,
    totalClients,
    byStatus,
    byPriority,
    totalOffers,
    acceptedOffersCount,
  ] = await Promise.all([
    prisma.request.findMany({
      where: { ...where, status: "COMPLETED" },
      select: {
        amount: true,
        updatedAt: true,
        clientId: true,
        client: { select: { name: true } },
        items: { select: { name: true, quantity: true, purchasePrice: true, total: true } },
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.request.findMany({
      where,
      select: { status: true, amount: true, assigneeId: true, assignee: { select: { name: true } } },
    }),
    prisma.client.count({ where }),
    prisma.request.groupBy({ by: ["status"], where, _count: { id: true } }),
    prisma.request.groupBy({ by: ["priority"], where, _count: { id: true } }),
    prisma.commercialOffer.count({ where }),
    prisma.commercialOffer.count({ where: { ...where, status: "ACCEPTED" } }),
  ]);

  // Общее число заявок — из уже загруженного массива, без доп. запроса.
  const totalRequestsCount = allRequests.length;

  // 1. Выручка и прибыль
  const totalRevenue = completedWithItems.reduce((s, r) => s + (r.amount ?? 0), 0);

  let profitableRevenue = 0;
  let totalCost = 0;
  completedWithItems.forEach((r) => {
    r.items.forEach((item) => {
      if (item.purchasePrice != null) {
        totalCost += item.purchasePrice * item.quantity;
        profitableRevenue += item.total ?? 0;
      }
    });
  });
  const totalProfit = profitableRevenue - totalCost;
  const margin = profitableRevenue > 0 ? (totalProfit / profitableRevenue) * 100 : null;

  // 2. Выручка и прибыль по месяцам
  const revenueByMonth: Record<string, { revenue: number; profitableRevenue: number; cost: number }> = {};
  completedWithItems.forEach((r) => {
    const key = r.updatedAt.toISOString().slice(0, 7);
    if (!revenueByMonth[key]) revenueByMonth[key] = { revenue: 0, profitableRevenue: 0, cost: 0 };
    revenueByMonth[key].revenue += r.amount ?? 0;
    r.items.forEach((item) => {
      if (item.purchasePrice != null) {
        revenueByMonth[key].cost += item.purchasePrice * item.quantity;
        revenueByMonth[key].profitableRevenue += item.total ?? 0;
      }
    });
  });
  const revenueChart = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      revenue: d.revenue,
      profit: d.cost > 0 ? d.profitableRevenue - d.cost : null,
    }));

  // 3. Топ клиентов
  const clientMap: Record<string, { name: string; revenue: number; count: number }> = {};
  completedWithItems.forEach((r) => {
    if (!clientMap[r.clientId]) clientMap[r.clientId] = { name: r.client.name, revenue: 0, count: 0 };
    clientMap[r.clientId].revenue += r.amount ?? 0;
    clientMap[r.clientId].count += 1;
  });
  const topClients = Object.values(clientMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((c) => ({ ...c, avgAmount: c.count > 0 ? c.revenue / c.count : 0 }));

  // 4. Эффективность менеджеров — из allRequests, без доп. запроса
  const managerMap: Record<string, { assigneeId: string; name: string; total: number; completed: number; revenue: number }> = {};
  allRequests.forEach((r) => {
    const key = r.assigneeId ?? "__none__";
    const name = r.assignee?.name ?? "Не назначен";
    if (!managerMap[key]) managerMap[key] = { assigneeId: key, name, total: 0, completed: 0, revenue: 0 };
    managerMap[key].total += 1;
    if (r.status === "COMPLETED") {
      managerMap[key].completed += 1;
      managerMap[key].revenue += r.amount ?? 0;
    }
  });
  const managers = Object.values(managerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map((m) => ({ ...m, conversionRate: m.total > 0 ? (m.completed / m.total) * 100 : 0 }));

  // 5. Выручка по услугам — из completedWithItems.items, без доп. запроса
  const serviceMap: Record<string, { name: string; revenue: number; quantity: number; cost: number; orders: number }> = {};
  completedWithItems.forEach((r) => {
    r.items.forEach((item) => {
      const key = item.name;
      if (!serviceMap[key]) serviceMap[key] = { name: key, revenue: 0, quantity: 0, cost: 0, orders: 0 };
      serviceMap[key].revenue += item.total ?? 0;
      serviceMap[key].quantity += item.quantity;
      serviceMap[key].orders += 1;
      if (item.purchasePrice != null) {
        serviceMap[key].cost += item.purchasePrice * item.quantity;
      }
    });
  });
  const topServices = Object.values(serviceMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)
    .map((s) => ({
      ...s,
      profit: s.cost > 0 ? s.revenue - s.cost : null,
      margin: s.cost > 0 && s.revenue > 0 ? ((s.revenue - s.cost) / s.revenue) * 100 : null,
    }));

  return NextResponse.json({
    summary: { totalRequests: totalRequestsCount, totalRevenue, totalClients, totalOffers, totalProfit, totalCost, margin },
    byStatus,
    byPriority,
    revenueChart,
    topClients,
    managers,
    topServices,
    funnel: [
      { label: "Заявки", value: totalRequestsCount },
      { label: "КП выставлено", value: totalOffers },
      { label: "КП принято", value: acceptedOffersCount },
    ],
  });
});
