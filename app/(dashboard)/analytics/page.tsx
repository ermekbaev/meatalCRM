"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, ClipboardList, Users, FileText, Award, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const MONTH_NAMES: Record<string, string> = {
  "01": "Янв", "02": "Фев", "03": "Мар", "04": "Апр",
  "05": "Май", "06": "Июн", "07": "Июл", "08": "Авг",
  "09": "Сен", "10": "Окт", "11": "Ноя", "12": "Дек",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новые", IN_PROGRESS: "В работе", COMPLETED: "Завершены",
  CANCELLED: "Отменены", APPROVAL: "На согласовании",
};
const STATUS_COLORS: Record<string, string> = {
  NEW: "#6366f1", IN_PROGRESS: "#f59e0b", COMPLETED: "#22c55e",
  CANCELLED: "#ef4444", APPROVAL: "#8b5cf6",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Низкий", MEDIUM: "Средний", HIGH: "Высокий", URGENT: "Срочный",
};
const PRIORITY_COLORS = ["#cbd5e1", "#94a3b8", "#f59e0b", "#ef4444"];

const PRESETS = [
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
  { label: "Год", days: 365 },
];

function fmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн ₽`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} тыс. ₽`;
  return `${v.toLocaleString("ru")} ₽`;
}

function StatCard({ icon: Icon, label, value, sub, accent = "orange" }: any) {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    orange: { bg: "bg-orange-50", text: "text-orange-600", icon: "text-orange-500" },
    green:  { bg: "bg-emerald-50", text: "text-emerald-600", icon: "text-emerald-500" },
    blue:   { bg: "bg-blue-50", text: "text-blue-600", icon: "text-blue-500" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", icon: "text-violet-500" },
  };
  const c = colors[accent];
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
            <p className={`text-2xl font-bold tracking-tight ${c.text}`}>{value}</p>
            {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
          </div>
          <div className={`rounded-xl ${c.bg} p-2.5`}>
            <Icon className={`h-5 w-5 ${c.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-slate-500">{p.name}: <span className="font-semibold text-slate-800">{typeof p.value === "number" && p.name === "Выручка" ? fmt(p.value) : p.value}</span></p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState(90);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(todayStr);
  const [customActive, setCustomActive] = useState(false);

  const getDateRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  };

  const fetchData = async (days: number) => {
    setLoading(true);
    const { from, to } = getDateRange(days);
    const res = await fetch(`/api/analytics?from=${from}&to=${to}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  const fetchCustom = async () => {
    if (!customFrom || !customTo) return;
    setLoading(true);
    setCustomActive(true);
    setActivePreset(0);
    const res = await fetch(`/api/analytics?from=${customFrom}&to=${customTo}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => { fetchData(activePreset); }, []);

  const handlePreset = (days: number) => {
    setActivePreset(days);
    setCustomActive(false);
    fetchData(days);
  };

  if (loading) {
    return (
      <div>
        <Header title="Аналитика" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
        </div>
      </div>
    );
  }

  const { summary, byStatus, byPriority, revenueChart, topClients, managers, funnel } = data;

  const statusData = byStatus.map((s: any) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s._count.id,
    color: STATUS_COLORS[s.status] ?? "#94a3b8",
  }));

  const priorityData = byPriority.map((p: any, i: number) => ({
    name: PRIORITY_LABELS[p.priority] ?? p.priority,
    value: p._count.id,
    color: PRIORITY_COLORS[i] ?? "#94a3b8",
  }));

  const revenueData = revenueChart.map((r: any) => {
    const [year, month] = r.month.split("-");
    return { ...r, label: `${MONTH_NAMES[month] ?? month} ${year.slice(2)}` };
  });

  const funnelTotal = funnel[0]?.value || 1;
  const funnelItems = [
    { label: "Заявок", value: funnel[0]?.value ?? 0, color: "bg-slate-700" },
    { label: "КП выставлено", value: funnel[1]?.value ?? 0, color: "bg-orange-500" },
    { label: "КП принято", value: funnel[2]?.value ?? 0, color: "bg-emerald-500" },
  ];

  return (
    <div>
      <Header title="Аналитика" />
      <div className="p-6 space-y-5">

        {/* Пресеты + произвольный период */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => handlePreset(p.days)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all",
                activePreset === p.days && !customActive
                  ? "bg-slate-800 text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
              )}
            >
              {p.label}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <div className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition-all",
            customActive ? "border-slate-800 bg-slate-800" : "border-slate-200 bg-white"
          )}>
            <input
              type="date"
              value={customFrom}
              max={customTo || todayStr}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={cn(
                "bg-transparent text-[13px] font-medium outline-none",
                customActive ? "text-white" : "text-slate-500"
              )}
            />
            <span className={cn("text-[11px]", customActive ? "text-slate-400" : "text-slate-300")}>—</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayStr}
              onChange={(e) => setCustomTo(e.target.value)}
              className={cn(
                "bg-transparent text-[13px] font-medium outline-none",
                customActive ? "text-white" : "text-slate-500"
              )}
            />
            <button
              onClick={fetchCustom}
              disabled={!customFrom || !customTo}
              className={cn(
                "ml-1 rounded-md px-2 py-0.5 text-[12px] font-medium transition-all",
                customActive
                  ? "bg-white/20 text-white hover:bg-white/30"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
              )}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Стат-карточки */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={ClipboardList} label="Заявок" value={summary.totalRequests} accent="orange" />
          <StatCard icon={TrendingUp} label="Выручка" value={fmt(summary.totalRevenue)} accent="green" />
          <StatCard icon={Users} label="Контрагентов" value={summary.totalClients} accent="blue" />
          <StatCard icon={FileText} label="КП выставлено" value={summary.totalOffers} accent="violet" />
        </div>

        {/* Выручка + Статусы */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-widest">Выручка по месяцам</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-slate-300 text-sm">Нет данных за период</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}к` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area dataKey="revenue" name="Выручка" stroke="#f97316" strokeWidth={2} fill="url(#revenueGrad)" dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Статусы */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-widest">По статусам</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-slate-300 text-sm">Нет данных</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                        {statusData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-1">
                    {statusData.map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-slate-500">{s.name}</span>
                        </div>
                        <span className="font-semibold text-slate-700">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Воронка + Приоритеты */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-widest">Воронка продаж</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {funnelItems.map((item, i) => {
                const pct = funnelTotal > 0 ? (item.value / funnelTotal) * 100 : 0;
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">{pct.toFixed(0)}%</span>
                        <span className="font-semibold text-slate-800 w-6 text-right">{item.value}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.color}`}
                        style={{ width: `${Math.max(pct, item.value > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-6 pt-2 border-t border-slate-100">
                {funnel[0]?.value > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <ArrowRight className="h-3 w-3" />
                    Конверсия в КП: <strong className="text-slate-600">{((funnel[1]?.value / funnel[0]?.value) * 100).toFixed(0)}%</strong>
                  </div>
                )}
                {funnel[1]?.value > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <ArrowRight className="h-3 w-3" />
                    Принятых КП: <strong className="text-slate-600">{((funnel[2]?.value / funnel[1]?.value) * 100).toFixed(0)}%</strong>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Приоритеты */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-widest">По приоритетам</CardTitle>
            </CardHeader>
            <CardContent>
              {priorityData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-slate-300 text-sm">Нет данных</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={priorityData} layout="vertical" margin={{ top: 0, right: 20, left: 55, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Заявок" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {priorityData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Топ клиентов + Менеджеры */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <Award className="h-3.5 w-3.5" /> Топ клиентов
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topClients.length === 0 ? (
                <p className="text-sm text-slate-300">Нет данных</p>
              ) : (
                <div className="space-y-3">
                  {topClients.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-slate-300 w-4 shrink-0 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-700">{c.name}</p>
                        <p className="text-[11px] text-slate-400">{c.count} заявок · ср. {fmt(c.avgAmount)}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 shrink-0 tabular-nums">{fmt(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-widest">Менеджеры</CardTitle>
            </CardHeader>
            <CardContent>
              {managers.length === 0 ? (
                <p className="text-sm text-slate-300">Нет данных</p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-4 pb-2 border-b border-slate-100">
                    {["Имя", "Заявок", "Конверсия", "Выручка"].map((h) => (
                      <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 last:text-right">{h}</span>
                    ))}
                  </div>
                  {managers.map((m: any, i: number) => (
                    <div key={i} className="grid grid-cols-4 items-center py-1.5 text-sm border-b border-slate-50 last:border-0">
                      <span className="truncate font-medium text-slate-700">{m.name}</span>
                      <span className="text-center text-slate-500 tabular-nums">{m.total}</span>
                      <span className={cn(
                        "text-center font-semibold tabular-nums",
                        m.conversionRate > 50 ? "text-emerald-600" : m.conversionRate > 20 ? "text-amber-500" : "text-red-400"
                      )}>
                        {m.conversionRate.toFixed(0)}%
                      </span>
                      <span className="text-right font-semibold text-slate-700 tabular-nums">{fmt(m.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
