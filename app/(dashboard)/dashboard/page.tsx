import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { formatCurrency, REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from "@/lib/utils";
import { Inbox, Loader, CheckCircle2, XCircle } from "lucide-react";
import { DashboardCharts } from "./DashboardCharts";
import { DashboardStats } from "./DashboardStats";
import { PopularItemsCard } from "./PopularItemsCard";
import { PeriodFilter } from "./PeriodFilter";
import Link from "next/link";
import { Suspense } from "react";

const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

function getPeriodStart(period: string): Date | null {
  const now = new Date();
  if (period === "week")    { const d = new Date(now); d.setDate(d.getDate() - 7);   return d; }
  if (period === "month")   { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
  if (period === "quarter") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  if (period === "year")    { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
  return null; // all
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = "month" } = await searchParams;
  const since = getPeriodStart(period);
  const dateFilter = since ? { createdAt: { gte: since } } : {};

  const [totalRequests, totalClients, totalOffers, requestsByStatus, recentRequests, revenue, completedRequests, topItems] =
    await Promise.all([
      prisma.request.count({ where: dateFilter }),
      prisma.client.count({ where: dateFilter }),
      prisma.commercialOffer.count({ where: dateFilter }),
      prisma.request.groupBy({ by: ["status"], _count: true, where: dateFilter }),
      prisma.request.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { client: true },
      }),
      prisma.request.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED", ...dateFilter },
      }),
      // Для графика выручки по месяцам — последние 6 месяцев
      prisma.request.findMany({
        where: {
          status: "COMPLETED",
          createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) },
        },
        select: { amount: true, createdAt: true },
      }),
      prisma.requestItem.groupBy({
        by: ["name"],
        _count: { name: true },
        _sum: { total: true },
        orderBy: { _count: { name: "desc" } },
        take: 5,
      }),
    ]);

  // Группируем выручку по месяцам
  const revenueByMonth: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    revenueByMonth[key] = 0;
  }
  completedRequests.forEach((r) => {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in revenueByMonth) revenueByMonth[key] += r.amount ?? 0;
  });
  const revenueData = Object.entries(revenueByMonth).map(([key, revenue]) => {
    const [year, month] = key.split("-").map(Number);
    return { month: MONTH_NAMES[month], revenue };
  });

  const stats = [
    { title: "Заявок",       value: totalRequests,                            icon: "ClipboardList", color: "text-slate-600", bg: "bg-slate-100"                  },
    { title: "Контрагенты",  value: totalClients,                             icon: "Users",         color: "text-slate-600", bg: "bg-slate-100"                  },
    { title: "КП создано",   value: totalOffers,                              icon: "FileText",      color: "text-slate-600", bg: "bg-slate-100"                  },
    { title: "Выручка",      value: formatCurrency(revenue._sum.amount ?? 0), icon: "TrendingUp",    color: "text-teal-600",  bg: "bg-teal-50",  clickable: true  },
  ];

  const statusData = requestsByStatus.map((s) => ({
    name: REQUEST_STATUS_LABELS[s.status] ?? s.status,
    value: s._count,
  }));

  const statusBlocks: Record<string, { icon: any; iconBg: string; iconColor: string; hoverShadow: string }> = {
    NEW:         { icon: Inbox,        iconBg: "bg-blue-100",    iconColor: "text-blue-500",    hoverShadow: "hover:shadow-blue-200   hover:shadow-lg" },
    IN_PROGRESS: { icon: Loader,       iconBg: "bg-amber-100",   iconColor: "text-amber-500",   hoverShadow: "hover:shadow-amber-200  hover:shadow-lg" },
    COMPLETED:   { icon: CheckCircle2, iconBg: "bg-emerald-100", iconColor: "text-emerald-500", hoverShadow: "hover:shadow-emerald-200 hover:shadow-lg" },
    CANCELLED:   { icon: XCircle,      iconBg: "bg-red-100",     iconColor: "text-red-500",     hoverShadow: "hover:shadow-red-200    hover:shadow-lg" },
  };

  return (
    <div className="min-h-screen bg-[#f1f3f5] overflow-x-hidden">
      <Header title="Главная" />
      <div className="p-4 lg:p-6 space-y-5">

        {/* Period filter */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            {period === "all" ? "За всё время" :
             period === "week" ? "За последние 7 дней" :
             period === "month" ? "За последние 30 дней" :
             period === "quarter" ? "За последние 3 месяца" :
             "За последний год"}
          </p>
          <Suspense>
            <PeriodFilter current={period} />
          </Suspense>
        </div>

        {/* Stat cards */}
        <DashboardStats stats={stats} />

        {/* Charts + recent */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DashboardCharts statusData={statusData} revenueData={revenueData} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Последние заявки</p>
              <Link href="/requests" className="text-xs text-slate-500 hover:text-slate-700 font-medium">
                Все →
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentRequests.map((req) => (
                <Link key={req.id} href={`/requests/${req.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                    #{req.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-slate-800">{req.title}</p>
                    <p className="truncate text-[11px] text-slate-400">{req.client.name}</p>
                  </div>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${REQUEST_STATUS_COLORS[req.status]}`}>
                    {REQUEST_STATUS_LABELS[req.status]}
                  </span>
                </Link>
              ))}
              {recentRequests.length === 0 && (
                <p className="px-5 py-8 text-center text-[13px] text-slate-400">Нет заявок</p>
              )}
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Object.entries(REQUEST_STATUS_LABELS).map(([key, label]) => {
            const count = requestsByStatus.find((s) => s.status === key)?._count ?? 0;
            const cfg = statusBlocks[key];
            return (
              <Link key={key} href={`/requests?status=${key}`}>
                <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 cursor-pointer ${cfg.hoverShadow}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-slate-800">{count}</p>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cfg.iconBg}`}>
                      <cfg.icon className={`h-4 w-4 ${cfg.iconColor}`} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-500">{label}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Popular items */}
        <PopularItemsCard items={topItems} />

      </div>
    </div>
  );
}
