"use client";
import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Loader2, TrendingUp, ClipboardList, Users, FileText, Award,
  ArrowRight, DollarSign, Percent, ChevronRight, X, Search,
  CheckCircle2, Clock, AlertCircle, XCircle, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import Link from "next/link";

// ─── Справочники ───────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, string> = {
  "01": "Янв", "02": "Фев", "03": "Мар", "04": "Апр",
  "05": "Май", "06": "Июн", "07": "Июл", "08": "Авг",
  "09": "Сен", "10": "Окт", "11": "Ноя", "12": "Дек",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новая",
  PENDING_APPROVAL: "На согласовании",
  IN_PROGRESS: "В работе",
  READY: "Готова",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
};
const STATUS_COLORS: Record<string, string> = {
  NEW: "#6366f1",
  PENDING_APPROVAL: "#8b5cf6",
  IN_PROGRESS: "#f59e0b",
  READY: "#06b6d4",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
};
const STATUS_ICONS: Record<string, React.ElementType> = {
  NEW: Clock,
  PENDING_APPROVAL: AlertCircle,
  IN_PROGRESS: RefreshCw,
  READY: CheckCircle2,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Низкий", MEDIUM: "Средний", HIGH: "Высокий", URGENT: "Срочный",
};
const PRIORITY_COLORS_MAP: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-500",
  MEDIUM: "bg-blue-50 text-blue-600",
  HIGH: "bg-amber-50 text-amber-600",
  URGENT: "bg-red-50 text-red-600",
};
const PRIORITY_CHART_COLORS = ["#cbd5e1", "#94a3b8", "#f59e0b", "#ef4444"];

const PRESETS = [
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
  { label: "Год", days: 365 },
];

const ALL_STATUSES = ["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED", "APPROVAL"];
const ALL_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function fmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн ₽`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} тыс. ₽`;
  return `${v.toLocaleString("ru")} ₽`;
}

// ─── StatCard ──────────────────────────────────────────────────────────────────

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
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
            <p className={`text-xl sm:text-2xl font-bold tracking-tight wrap-break-word ${c.text}`}>{value}</p>
            {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
          </div>
          <div className={`rounded-xl ${c.bg} p-2.5 shrink-0`}>
            <Icon className={`h-5 w-5 ${c.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CustomTooltip ─────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        p.value != null && (
          <p key={i} className="text-slate-500">
            {p.name}: <span className="font-semibold text-slate-800">
              {typeof p.value === "number" && (p.name === "Выручка" || p.name === "Прибыль") ? fmt(p.value) : p.value}
            </span>
          </p>
        )
      ))}
    </div>
  );
};

// ─── Drawer: детализация по менеджеру ─────────────────────────────────────────

type ManagerRequest = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  amount: number | null;
  paymentStatus: string;
  createdAt: string;
  client: { id: string; name: string };
  items: { name: string; quantity: number; total: number; purchasePrice: number | null }[];
};

function ManagerDrawer({
  managerId,
  managerName,
  from,
  to,
  onClose,
}: {
  managerId: string;
  managerName: string;
  from: string;
  to: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ assigneeId: managerId, from, to });
    fetch(`/api/analytics/manager-requests?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRequests(data.requests ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [managerId, from, to]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter.length && !statusFilter.includes(r.status)) return false;
      if (priorityFilter.length && !priorityFilter.includes(r.priority)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.client.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [requests, statusFilter, priorityFilter, search]);

  // Саммари по отфильтрованным заявкам
  const summary = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter((r) => r.status === "COMPLETED").length;
    const revenue = filtered.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + (r.amount ?? 0), 0);
    const conversion = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, revenue, conversion };
  }, [filtered]);

  const toggleStatus = (s: string) =>
    setStatusFilter((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  const togglePriority = (p: string) =>
    setPriorityFilter((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    requests.forEach((r) => { m[r.status] = (m[r.status] ?? 0) + 1; });
    return m;
  }, [requests]);

  const priorityCounts = useMemo(() => {
    const m: Record<string, number> = {};
    requests.forEach((r) => { m[r.priority] = (m[r.priority] ?? 0) + 1; });
    return m;
  }, [requests]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Панель */}
      <div className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-3xl flex-col bg-white shadow-2xl">
        {/* Шапка (safe-area-inset-top — чтобы не уходила под статус-бар в iOS PWA) */}
        <div className="drawer-header-top flex items-center justify-between border-b border-slate-100 px-5 pb-4 shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Детализация</p>
            <h2 className="text-base font-semibold text-slate-800 mt-0.5">{managerName}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Саммари */}
            <div className="grid grid-cols-4 gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
              {[
                { label: "Заявок", value: summary.total, cls: "text-slate-800" },
                { label: "Завершено", value: summary.completed, cls: "text-emerald-600" },
                { label: "Конверсия", value: `${summary.conversion.toFixed(0)}%`, cls: summary.conversion > 50 ? "text-emerald-600" : summary.conversion > 20 ? "text-amber-500" : "text-red-400" },
                { label: "Выручка", value: fmt(summary.revenue), cls: "text-slate-800" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{s.label}</p>
                  <p className={`text-base font-bold mt-0.5 ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Фильтры */}
            <div className="space-y-2 px-5 py-3 border-b border-slate-100 shrink-0">
              {/* Поиск */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Поиск по заявке или контрагенту…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>

              {/* Статусы */}
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((s) => {
                  const cnt = statusCounts[s] ?? 0;
                  if (!cnt) return null;
                  const active = statusFilter.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ring-1",
                        active
                          ? "text-white ring-transparent"
                          : "bg-white ring-slate-200 text-slate-500 hover:ring-slate-300"
                      )}
                      style={active ? { backgroundColor: STATUS_COLORS[s] } : {}}
                    >
                      {STATUS_LABELS[s]} <span className={active ? "opacity-70" : "text-slate-400"}>{cnt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Приоритеты */}
              <div className="flex flex-wrap gap-1.5">
                {ALL_PRIORITIES.map((p) => {
                  const cnt = priorityCounts[p] ?? 0;
                  if (!cnt) return null;
                  const active = priorityFilter.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ring-1",
                        active
                          ? "bg-slate-800 text-white ring-transparent"
                          : `ring-slate-200 hover:ring-slate-300 ${PRIORITY_COLORS_MAP[p]}`
                      )}
                    >
                      {PRIORITY_LABELS[p]} <span className={active ? "opacity-70" : "opacity-60"}>{cnt}</span>
                    </button>
                  );
                })}
                {(statusFilter.length > 0 || priorityFilter.length > 0 || search) && (
                  <button
                    onClick={() => { setStatusFilter([]); setPriorityFilter([]); setSearch(""); }}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200 hover:text-red-500 hover:ring-red-200 transition-colors"
                  >
                    <X className="h-3 w-3" /> Сбросить
                  </button>
                )}
              </div>
            </div>

            {/* Список заявок — overflow-auto: широкая таблица скроллится по горизонтали на телефоне, а не обрезается */}
            <div className="flex-1 overflow-auto">
              {filtered.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-slate-300">
                  Нет заявок по выбранным фильтрам
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                    <tr>
                      {/* «Сумма» выравнивается вправо — под значениями */}
                      {[
                        { label: "№", align: "text-left w-12" },
                        { label: "Заявка", align: "text-left" },
                        { label: "Контрагент", align: "text-left" },
                        { label: "Статус", align: "text-left" },
                        { label: "Приоритет", align: "text-left" },
                        { label: "Сумма", align: "text-right" },
                        { label: "Дата", align: "text-left" },
                      ].map((c) => (
                        <th
                          key={c.label}
                          className={cn("px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap", c.align)}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const StatusIcon = STATUS_ICONS[r.status] ?? Clock;
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors group"
                        >
                          <td className="px-4 py-3 text-[11px] font-semibold text-slate-400 tabular-nums">
                            #{r.number}
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <Link
                              href={`/requests/${r.id}`}
                              className="font-medium text-slate-700 hover:text-orange-600 line-clamp-2 leading-snug transition-colors"
                            >
                              {r.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-[140px]">
                            <span className="truncate block">{r.client.name}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                              style={{ backgroundColor: STATUS_COLORS[r.status] + "18", color: STATUS_COLORS[r.status] }}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {STATUS_LABELS[r.status] ?? r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", PRIORITY_COLORS_MAP[r.priority])}>
                              {PRIORITY_LABELS[r.priority] ?? r.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                            {r.amount != null ? fmt(r.amount) : <span className="text-slate-300 font-normal">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap tabular-nums">
                            {new Date(r.createdAt).toLocaleDateString("ru", { day: "2-digit", month: "short" })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Футер */}
            <div className="safe-area-inset-bottom border-t border-slate-100 px-5 py-2.5 shrink-0 text-[11px] text-slate-400">
              Показано {filtered.length} из {requests.length} заявок
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Drawer: детализация по позиции (услуга/товар) ──────────────────────────────

type ItemRequest = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  amount: number | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string };
  itemQuantity: number;
  itemRevenue: number;
  itemProfit: number | null;
};

function ItemDrawer({
  name,
  typeLabel,
  from,
  to,
  onClose,
}: {
  name: string;
  typeLabel: string;
  from: string;
  to: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [totals, setTotals] = useState({ orders: 0, quantity: 0, revenue: 0 });
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ name, from, to });
    fetch(`/api/analytics/item-requests?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRequests(data.requests ?? []);
        setTotals(data.totals ?? { orders: 0, quantity: 0, revenue: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [name, from, to]);

  const filtered = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter((r) => r.title.toLowerCase().includes(q) || r.client.name.toLowerCase().includes(q));
  }, [requests, search]);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-3xl flex-col bg-white shadow-2xl">
        {/* Шапка (safe-area-inset-top — чтобы не уходила под статус-бар в iOS PWA) */}
        <div className="drawer-header-top flex items-center justify-between border-b border-slate-100 px-5 pb-4 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{typeLabel}</p>
            <h2 className="text-base font-semibold text-slate-800 mt-0.5 truncate">{name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Саммари по позиции */}
            <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
              {[
                { label: "Заявок", value: totals.orders, cls: "text-slate-800" },
                { label: "Количество", value: totals.quantity.toLocaleString("ru"), cls: "text-slate-800" },
                { label: "Выручка", value: fmt(totals.revenue), cls: "text-emerald-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{s.label}</p>
                  <p className={`text-base font-bold mt-0.5 ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Поиск */}
            <div className="px-5 py-3 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Поиск по заявке или контрагенту…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>

            {/* Список заявок */}
            <div className="flex-1 overflow-auto">
              {filtered.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-slate-300">
                  Нет заявок по выбранным фильтрам
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                    <tr>
                      {[
                        { label: "№", align: "text-left w-12" },
                        { label: "Заявка", align: "text-left" },
                        { label: "Контрагент", align: "text-left" },
                        { label: "Кол-во", align: "text-right" },
                        { label: "Выручка", align: "text-right" },
                        { label: "Завершена", align: "text-right" },
                      ].map((c) => (
                        <th key={c.label} className={cn("px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap", c.align)}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const StatusIcon = STATUS_ICONS[r.status] ?? Clock;
                      return (
                        <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 text-[11px] font-semibold text-slate-400 tabular-nums">#{r.number}</td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <Link
                              href={`/requests/${r.id}`}
                              className="font-medium text-slate-700 hover:text-orange-600 line-clamp-2 leading-snug transition-colors inline-flex items-center gap-1.5"
                            >
                              <StatusIcon className="h-3 w-3 shrink-0" style={{ color: STATUS_COLORS[r.status] }} />
                              {r.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-[140px]">
                            <span className="truncate block">{r.client.name}</span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600 whitespace-nowrap">
                            {r.itemQuantity.toLocaleString("ru")}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                            {fmt(r.itemRevenue)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400 text-[11px] whitespace-nowrap tabular-nums">
                            {new Date(r.updatedAt).toLocaleDateString("ru", { day: "2-digit", month: "short", year: "2-digit" })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Футер */}
            <div className="safe-area-inset-bottom border-t border-slate-100 px-5 py-2.5 shrink-0 text-[11px] text-slate-400">
              Показано {filtered.length} из {requests.length} заявок
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Таблица «Выручка по услугам / товарам» ─────────────────────────────────────

function RevenueByItemsCard({
  title,
  itemHeader,
  rows,
  onSelect,
}: {
  title: string;
  itemHeader: string;
  rows: any[];
  onSelect: (name: string) => void;
}) {
  if (!rows || rows.length === 0) return null;
  const maxRevenue = rows[0]?.revenue ?? 1;
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-widest">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {/* Выравнивание заголовков совпадает с ячейками: № и числовые колонки — вправо, название — влево */}
                {[
                  { label: "#", align: "text-right w-8" },
                  { label: itemHeader, align: "text-left" },
                  { label: "Кол-во в заявках", align: "text-right" },
                  { label: "Выручка", align: "text-right" },
                  { label: "Прибыль", align: "text-right" },
                  { label: "Маржа", align: "text-right" },
                  { label: "", align: "w-6" },
                ].map((c, i) => (
                  <th key={i} className={cn("py-2.5 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap", c.align)}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any, i: number) => {
                const barWidth = maxRevenue > 0 ? (s.revenue / maxRevenue) * 100 : 0;
                return (
                  <tr
                    key={i}
                    onClick={() => onSelect(s.name)}
                    className="border-b border-slate-50 last:border-0 hover:bg-orange-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-4 text-[11px] font-semibold text-slate-300 text-right w-8">{i + 1}</td>
                    <td className="py-2.5 px-4">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-700 leading-tight">{s.name}</p>
                        <div className="h-1 rounded-full bg-slate-100 overflow-hidden w-full max-w-50">
                          <div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500 tabular-nums whitespace-nowrap">{s.orders} <span className="text-slate-300">зак.</span></td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">{fmt(s.revenue)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums whitespace-nowrap">
                      {s.profit != null
                        ? <span className={s.profit >= 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>{fmt(s.profit)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums whitespace-nowrap">
                      {s.margin != null
                        ? <span className={cn("font-semibold", s.margin > 30 ? "text-emerald-600" : s.margin > 10 ? "text-amber-500" : "text-red-500")}>{s.margin.toFixed(1)}%</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-orange-400 transition-colors ml-auto" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2.5 text-[11px] text-slate-400 border-t border-slate-100">
          Прибыль и маржа рассчитываются только по позициям с указанной себестоимостью
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Главная страница ──────────────────────────────────────────────────────────

const STORAGE_KEY = "analytics_period";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const todayStr = new Date().toISOString().slice(0, 10);

  const saved = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    : null;

  const [activePreset, setActivePreset] = useState<number>(saved?.preset ?? 90);
  const [customFrom, setCustomFrom] = useState(saved?.from ?? "");
  const [customTo, setCustomTo] = useState(saved?.to ?? todayStr);
  const [customActive, setCustomActive] = useState(saved?.customActive ?? false);

  // Текущий диапазон дат для drawer
  const [currentFrom, setCurrentFrom] = useState("");
  const [currentTo, setCurrentTo] = useState("");

  // Drill-down
  const [drawerManager, setDrawerManager] = useState<{ id: string; name: string } | null>(null);
  const [drawerItem, setDrawerItem] = useState<{ name: string; typeLabel: string } | null>(null);

  const savePeriod = (obj: object) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));

  const getDateRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  };

  const applyResult = async (res: Response) => {
    if (!res.ok) {
      setFetchError("Не удалось загрузить данные. Проверьте соединение и попробуйте снова.");
      setData(null);
    } else {
      setFetchError(null);
      setData(await res.json());
    }
    setLoading(false);
  };

  const fetchData = async (days: number) => {
    setLoading(true);
    const { from, to } = getDateRange(days);
    setCurrentFrom(from);
    setCurrentTo(to);
    await applyResult(await fetch(`/api/analytics?from=${from}&to=${to}`));
  };

  const fetchCustom = async (from = customFrom, to = customTo) => {
    if (!from || !to) return;
    setLoading(true);
    setCustomActive(true);
    setActivePreset(0);
    setCurrentFrom(from);
    setCurrentTo(to);
    savePeriod({ customActive: true, preset: 0, from, to });
    await applyResult(await fetch(`/api/analytics?from=${from}&to=${to}`));
  };

  useEffect(() => {
    if (saved?.customActive && saved.from && saved.to) {
      fetchCustom(saved.from, saved.to);
    } else {
      fetchData(saved?.preset ?? 90);
    }
  }, []);

  const handlePreset = (days: number) => {
    setActivePreset(days);
    setCustomActive(false);
    savePeriod({ preset: days, customActive: false, from: customFrom, to: customTo });
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

  if (fetchError || !data) {
    return (
      <div>
        <Header title="Аналитика" />
        <div className="flex flex-col h-64 items-center justify-center gap-4">
          <p className="text-sm text-slate-500">{fetchError ?? "Нет данных"}</p>
          <button
            onClick={() => customActive ? fetchCustom() : fetchData(activePreset || 90)}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  const { summary, byStatus, byPriority, revenueChart, topClients, managers, topServices, topProducts, funnel } = data;

  const statusData = byStatus.map((s: any) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s._count.id,
    color: STATUS_COLORS[s.status] ?? "#94a3b8",
  }));

  const priorityData = byPriority.map((p: any, i: number) => ({
    name: PRIORITY_LABELS[p.priority] ?? p.priority,
    value: p._count.id,
    color: PRIORITY_CHART_COLORS[i] ?? "#94a3b8",
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
      <div className="p-4 lg:p-6 space-y-5">

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/analytics/production"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
          >
            <Package className="h-3.5 w-3.5" /> Аналитика производства
          </a>
        </div>

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
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 transition-all hover:border-slate-300">
            <input
              type="date"
              value={customFrom}
              max={customTo || todayStr}
              onChange={(e) => { setCustomFrom(e.target.value); savePeriod({ preset: activePreset, customActive, from: e.target.value, to: customTo }); }}
              className="bg-transparent text-[13px] font-medium text-slate-500 outline-none"
            />
            <span className="text-[11px] text-slate-300">—</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayStr}
              onChange={(e) => { setCustomTo(e.target.value); savePeriod({ preset: activePreset, customActive, from: customFrom, to: e.target.value }); }}
              className="bg-transparent text-[13px] font-medium text-slate-500 outline-none"
            />
            <button
              onClick={() => fetchCustom()}
              disabled={!customFrom || !customTo}
              className={cn(
                "ml-1 rounded-md px-2 py-0.5 transition-all disabled:opacity-30",
                customActive ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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

        {summary.totalCost > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={DollarSign}
              label="Чистая прибыль"
              value={fmt(summary.totalProfit)}
              sub={`Себестоимость: ${fmt(summary.totalCost)}`}
              accent="green"
            />
            <StatCard
              icon={Percent}
              label="Маржинальность"
              value={summary.margin != null ? `${summary.margin.toFixed(1)}%` : "—"}
              sub="По заявкам с указанной себестоимостью"
              accent="blue"
            />
          </div>
        )}

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
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}к` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area dataKey="revenue" name="Выручка" stroke="#f97316" strokeWidth={2} fill="url(#revenueGrad)" dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    <Line dataKey="profit" name="Прибыль" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

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
                        {statusData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
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
                      <div className={`h-full rounded-full transition-all ${item.color}`} style={{ width: `${Math.max(pct, item.value > 0 ? 2 : 0)}%` }} />
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
                      {priorityData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Выручка по услугам / товарам */}
        <RevenueByItemsCard title="Выручка по услугам" itemHeader="Услуга" rows={topServices} onSelect={(name) => setDrawerItem({ name, typeLabel: "Услуга" })} />
        <RevenueByItemsCard title="Выручка по товарам" itemHeader="Товар" rows={topProducts} onSelect={(name) => setDrawerItem({ name, typeLabel: "Товар" })} />

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

          {/* ─── Менеджеры с drill-down ─── */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-widest">
                Менеджеры
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {managers.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-300">Нет данных</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {/* Выравнивание заголовков совпадает с ячейками ниже */}
                      {[
                        { label: "Имя", align: "text-left" },
                        { label: "Заявок", align: "text-center" },
                        { label: "Конверсия", align: "text-center" },
                        { label: "Выручка", align: "text-right" },
                        { label: "", align: "w-6" },
                      ].map((c, i) => (
                        <th key={i} className={cn("px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400", c.align)}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {managers.map((m: any, i: number) => (
                      <tr
                        key={i}
                        onClick={() => setDrawerManager({ id: m.assigneeId, name: m.name })}
                        className="border-b border-slate-50 last:border-0 hover:bg-orange-50/60 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-700 max-w-[120px]">
                          <span className="truncate block">{m.name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-500 tabular-nums">{m.total}</td>
                        <td className={cn(
                          "px-4 py-2.5 text-center font-semibold tabular-nums",
                          m.conversionRate > 50 ? "text-emerald-600" : m.conversionRate > 20 ? "text-amber-500" : "text-red-400"
                        )}>
                          {m.conversionRate.toFixed(0)}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                          {fmt(m.revenue)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-orange-400 transition-colors ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Drawer: менеджер */}
      {drawerManager && (
        <ManagerDrawer
          managerId={drawerManager.id}
          managerName={drawerManager.name}
          from={currentFrom}
          to={currentTo}
          onClose={() => setDrawerManager(null)}
        />
      )}

      {/* Drawer: позиция (услуга/товар) */}
      {drawerItem && (
        <ItemDrawer
          name={drawerItem.name}
          typeLabel={drawerItem.typeLabel}
          from={currentFrom}
          to={currentTo}
          onClose={() => setDrawerItem(null)}
        />
      )}
    </div>
  );
}
