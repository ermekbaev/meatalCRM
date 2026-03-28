import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter = {
    ...(from && { gte: new Date(from) }),
    ...(to && { lte: new Date(to + "T23:59:59.999Z") }),
  };
  const where = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

  // 1. Общие цифры
  const [totalRequests, completedRequests, totalClients, totalOffers] = await Promise.all([
    prisma.request.count({ where }),
    prisma.request.findMany({
      where: { ...where, status: "COMPLETED", amount: { gt: 0 } },
      select: { amount: true },
    }),
    prisma.client.count({ where }),
    prisma.commercialOffer.count({ where }),
  ]);

  const totalRevenue = completedRequests.reduce((s, r) => s + (r.amount ?? 0), 0);

  // 2. Заявки по статусам
  const byStatus = await prisma.request.groupBy({
    by: ["status"],
    where,
    _count: { id: true },
  });

  // 3. Выручка по месяцам (последние 12 или по фильтру)
  const revenueRequests = await prisma.request.findMany({
    where: { ...where, status: "COMPLETED", amount: { gt: 0 } },
    select: { amount: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
  });

  const revenueByMonth: Record<string, number> = {};
  revenueRequests.forEach((r) => {
    const key = r.updatedAt.toISOString().slice(0, 7); // "2025-03"
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (r.amount ?? 0);
  });
  const revenueChart = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }));

  // 4. Топ клиентов по выручке
  const completedWithClient = await prisma.request.findMany({
    where: { ...where, status: "COMPLETED", amount: { gt: 0 } },
    select: { amount: true, clientId: true, client: { select: { name: true } } },
  });
  const clientMap: Record<string, { name: string; revenue: number; count: number }> = {};
  completedWithClient.forEach((r) => {
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

  return NextResponse.json({
    summary: { totalRequests, totalRevenue, totalClients, totalOffers },
    byStatus,
    byPriority,
    revenueChart,
    topClients,
    managers,
    funnel: [
      { label: "Заявки", value: requestsCount },
      { label: "КП выставлено", value: offersCount },
      { label: "КП принято", value: acceptedOffersCount },
    ],
  });
}
