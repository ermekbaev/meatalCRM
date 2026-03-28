"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, ClipboardList, Users, FileText, Award, Target } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const MONTH_NAMES: Record<string, string> = {
  "01": "Янв", "02": "Фев", "03": "Мар", "04": "Апр",
  "05": "Май", "06": "Июн", "07": "Июл", "08": "Авг",
  "09": "Сен", "10": "Окт", "11": "Ноя", "12": "Дек",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новые", IN_PROGRESS: "В работе", COMPLETED: "Завершены", CANCELLED: "Отменены",
  APPROVAL: "На согласовании",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "#3b82f6", IN_PROGRESS: "#f59e0b", COMPLETED: "#22c55e",
  CANCELLED: "#ef4444", APPROVAL: "#8b5cf6",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Низкий", MEDIUM: "Средний", HIGH: "Высокий", URGENT: "Срочный",
};
const PRIORITY_COLORS = ["#94a3b8", "#3b82f6", "#f59e0b", "#ef4444"];

function StatCard({ icon: Icon, label, value, sub, color = "text-orange-600" }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] text-slate-500 font-medium uppercase tracking-wide">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
          </div>
          <div className="rounded-lg bg-orange-50 p-2.5">
            <Icon className="h-5 w-5 text-orange-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="font-bold text-slate-800">{value}</span>
      </div>
      <div className="h-8 rounded-lg bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-lg flex items-center px-3 text-white text-sm font-medium transition-all"
          style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
        >
          {pct > 10 ? `${pct.toFixed(0)}%` : ""}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Фильтр дат (по умолчанию — последние 3 месяца)
  const getDefaultFrom = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  };
  const getDefaultTo = () => new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(getDefaultFrom());
  const [to, setTo] = useState(getDefaultTo());

  const fetchData = async (f: string, t: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    const res = await fetch(`/api/analytics?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => { fetchData(from, to); }, []);

  const applyFilter = () => fetchData(from, to);
  const resetFilter = () => {
    const f = getDefaultFrom();
    const t = getDefaultTo();
    setFrom(f);
    setTo(t);
    fetchData(f, t);
  };

  const fmtRevenue = (v: number) =>
    v >= 1_000_000
      ? `${(v / 1_000_000).toFixed(1)} млн ₽`
      : `${v.toLocaleString("ru")} ₽`;

  if (loading) {
    return (
      <div>
        <Header title="Аналитика" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const { summary, byStatus, byPriority, revenueChart, topClients, managers, funnel } = data;
  const funnelMax = funnel[0]?.value ?? 1;

  const statusChartData = byStatus.map((s: any) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s._count.id,
    color: STATUS_COLORS[s.status] ?? "#94a3b8",
  }));

  const priorityChartData = byPriority.map((p: any, i: number) => ({
    name: PRIORITY_LABELS[p.priority] ?? p.priority,
    value: p._count.id,
    color: PRIORITY_COLORS[i] ?? "#94a3b8",
  }));

  const revenueChartData = revenueChart.map((r: any) => ({
    ...r,
    label: (() => {
      const [year, month] = r.month.split("-");
      return `${MONTH_NAMES[month] ?? month} ${year.slice(2)}`;
    })(),
  }));

  return (
    <div>
      <Header title="Аналитика" />
      <div className="p-6 space-y-6">

        {/* Фильтр */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">С</p>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-40 text-sm" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">По</p>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-40 text-sm" />
              </div>
              <Button onClick={applyFilter} size="sm" className="h-8">Применить</Button>
              <Button onClick={resetFilter} size="sm" variant="outline" className="h-8">Сброс</Button>
            </div>
          </CardContent>
        </Card>

        {/* Итоговые цифры */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={ClipboardList} label="Заявок" value={summary.totalRequests} />
          <StatCard icon={TrendingUp} label="Выручка" value={fmtRevenue(summary.totalRevenue)} color="text-green-600" />
          <StatCard icon={Users} label="Контрагентов" value={summary.totalClients} color="text-blue-600" />
          <StatCard icon={FileText} label="КП выставлено" value={summary.totalOffers} color="text-purple-600" />
        </div>

        {/* Графики */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Выручка по месяцам */}
          <Card>
            <CardHeader><CardTitle className="text-base">Выручка по месяцам</CardTitle></CardHeader>
            <CardContent>
              {revenueChartData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Нет данных</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={revenueChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} />
                    <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString("ru")} ₽`, "Выручка"]} />
                    <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Заявки по статусам */}
          <Card>
            <CardHeader><CardTitle className="text-base">Заявки по статусам</CardTitle></CardHeader>
            <CardContent>
              {statusChartData.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Нет данных</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusChartData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Воронка продаж */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Воронка продаж
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-w-lg">
            <FunnelBar label="Заявок" value={funnel[0]?.value ?? 0} max={funnelMax} color="#3b82f6" />
            <FunnelBar label="КП выставлено" value={funnel[1]?.value ?? 0} max={funnelMax} color="#f59e0b" />
            <FunnelBar label="КП принято" value={funnel[2]?.value ?? 0} max={funnelMax} color="#22c55e" />
            <div className="flex gap-4 pt-2 text-sm text-slate-500">
              {funnel[0]?.value > 0 && (
                <span>
                  Конверсия в КП: <strong className="text-slate-700">{((funnel[1]?.value / funnel[0]?.value) * 100).toFixed(0)}%</strong>
                </span>
              )}
              {funnel[1]?.value > 0 && (
                <span>
                  Принятых КП: <strong className="text-slate-700">{((funnel[2]?.value / funnel[1]?.value) * 100).toFixed(0)}%</strong>
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Топ клиентов */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" /> Топ клиентов по выручке
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topClients.length === 0 ? (
                <p className="text-sm text-slate-400">Нет данных</p>
              ) : (
                <div className="space-y-2">
                  {topClients.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-5 text-right text-[11px] text-slate-400 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-700">{c.name}</p>
                        <p className="text-[11px] text-slate-400">{c.count} заявок · ср. {fmtRevenue(c.avgAmount)}</p>
                      </div>
                      <span className="text-sm font-bold text-green-600 shrink-0">{fmtRevenue(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Менеджеры */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Эффективность менеджеров</CardTitle>
            </CardHeader>
            <CardContent>
              {managers.length === 0 ? (
                <p className="text-sm text-slate-400">Нет данных</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 text-[11px] text-slate-400 font-medium pb-1 border-b border-slate-100">
                    <span>Имя</span>
                    <span className="text-center">Заявок</span>
                    <span className="text-center">Конверсия</span>
                    <span className="text-right">Выручка</span>
                  </div>
                  {managers.map((m: any, i: number) => (
                    <div key={i} className="grid grid-cols-4 items-center text-sm">
                      <span className="truncate font-medium text-slate-700">{m.name}</span>
                      <span className="text-center text-slate-500">{m.total}</span>
                      <span className={`text-center font-medium ${m.conversionRate > 50 ? "text-green-600" : m.conversionRate > 20 ? "text-amber-600" : "text-red-500"}`}>
                        {m.conversionRate.toFixed(0)}%
                      </span>
                      <span className="text-right font-bold text-slate-700">{fmtRevenue(m.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Заявки по приоритетам */}
        {priorityChartData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Заявки по приоритетам</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={priorityChartData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {priorityChartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
