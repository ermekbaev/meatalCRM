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

  // 1. Общие цифры + выручка/прибыль — один запрос по завершённым заявкам с позициями
  const [completedWithItems, totalRequestsCount, totalClients, totalOffers] = await Promise.all([
    prisma.request.findMany({
      where: { ...where, status: "COMPLETED" },
      select: {
        amount: true,
        updatedAt: true,
        clientId: true,
        client: { select: { name: true } },
        items: { select: { quantity: true, purchasePrice: true } },
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.request.count({ where }),
    prisma.client.count({ where }),
    prisma.commercialOffer.count({ where }),
  ]);

  const totalRevenue = completedWithItems.reduce((s, r) => s + (r.amount ?? 0), 0);

  // Считаем себестоимость только по позициям с указанной закупочной ценой
  let totalCost = 0;
  completedWithItems.forEach((r) => {
    r.items.forEach((item) => {
      if (item.purchasePrice != null) {
        totalCost += item.purchasePrice * item.quantity;
      }
    });
  });
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 && totalCost > 0 ? (totalProfit / totalRevenue) * 100 : null;

  // 2. Заявки по статусам
  const byStatus = await prisma.request.groupBy({
    by: ["status"],
    where,
    _count: { id: true },
  });

  // 3. Выручка и прибыль по месяцам
  const revenueByMonth: Record<string, { revenue: number; profit: number; cost: number }> = {};
  completedWithItems.forEach((r) => {
    const key = r.updatedAt.toISOString().slice(0, 7);
    if (!revenueByMonth[key]) revenueByMonth[key] = { revenue: 0, profit: 0, cost: 0 };
    revenueByMonth[key].revenue += r.amount ?? 0;
    let reqCost = 0;
    r.items.forEach((item) => {
      if (item.purchasePrice != null) reqCost += item.purchasePrice * item.quantity;
    });
    revenueByMonth[key].cost += reqCost;
    revenueByMonth[key].profit += (r.amount ?? 0) - reqCost;
  });
  const revenueChart = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({ month, revenue: d.revenue, profit: d.cost > 0 ? d.profit : null }));

  // 4. Топ клиентов по выручке
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

  // 5. Эффективность менеджеров
  const allRequests = await prisma.request.findMany({
    where,
    select: { status: true, amount: true, assigneeId: true, assignee: { select: { name: true } } },
  });
  const managerMap: Record<string, { name: string; total: number; completed: number; revenue: number }> = {};
  allRequests.forEach((r) => {
    const key = r.assigneeId ?? "__none__";
    const name = r.assignee?.name ?? "Не назначен";
    if (!managerMap[key]) managerMap[key] = { name, total: 0, completed: 0, revenue: 0 };
    managerMap[key].total += 1;
    if (r.status === "COMPLETED") {
      managerMap[key].completed += 1;
      managerMap[key].revenue += r.amount ?? 0;
    }
  });
  const managers = Object.values(managerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map((m) => ({ ...m, conversionRate: m.total > 0 ? (m.completed / m.total) * 100 : 0 }));

  // 6. Воронка: заявки → КП → принятые КП
  const [requestsCount, offersCount, acceptedOffersCount] = await Promise.all([
    prisma.request.count({ where }),
    prisma.commercialOffer.count({ where }),
    prisma.commercialOffer.count({ where: { ...where, status: "ACCEPTED" } }),
  ]);

  // 7. Заявки по приоритетам
  const byPriority = await prisma.request.groupBy({
    by: ["priority"],
    where,
    _count: { id: true },
  });

  // 8. Выручка по услугам (позиции завершённых заявок)
  const serviceItems = await prisma.requestItem.findMany({
    where: { request: { ...where, status: "COMPLETED" } },
    select: { name: true, quantity: true, total: true, purchasePrice: true },
  });

  const serviceMap: Record<string, { name: string; revenue: number; quantity: number; cost: number; orders: number }> = {};
  serviceItems.forEach((item) => {
    const key = item.name;
    if (!serviceMap[key]) serviceMap[key] = { name: key, revenue: 0, quantity: 0, cost: 0, orders: 0 };
    serviceMap[key].revenue += item.total ?? 0;
    serviceMap[key].quantity += item.quantity;
    serviceMap[key].orders += 1;
    if (item.purchasePrice != null) {
      serviceMap[key].cost += item.purchasePrice * item.quantity;
    }
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
      { label: "Заявки", value: requestsCount },
      { label: "КП выставлено", value: offersCount },
      { label: "КП принято", value: acceptedOffersCount },
    ],
  });
});
