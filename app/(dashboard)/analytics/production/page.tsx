"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, Clock, Award, Activity } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

const PRESETS = [
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
  { label: "Год", days: 365 },
];

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default function ProductionAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/production?days=${days}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <Header title="Аналитика производства" />
      <div className="p-4 lg:p-6 space-y-5">
        {/* Period switch */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                days === p.days
                  ? "bg-orange-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading || !data ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={CheckCircle2} label="Выполнено" value={String(data.totalDone)} accent="green" />
              <KpiCard icon={Activity} label="В работе" value={String(data.inProgress)} accent="blue" />
              <KpiCard
                icon={Clock}
                label="Среднее время"
                value={data.avgHours > 24 ? `${(data.avgHours / 24).toFixed(1)} дн` : `${data.avgHours.toFixed(1)} ч`}
                accent="orange"
              />
              <KpiCard
                icon={Award}
                label="Лидер"
                value={data.topOperators?.[0]?.name ?? "—"}
                sub={data.topOperators?.[0]?.count ? `${data.topOperators[0].count} подзадач` : undefined}
                accent="purple"
              />
            </div>

            {/* Daily completed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Подзадачи по дням</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dailySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={11} stroke="#94a3b8" />
                    <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                    <Tooltip
                      labelFormatter={(v) => v ? new Date(String(v)).toLocaleDateString("ru-RU") : ""}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top operators */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Топ операторов</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  {data.topOperators.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      За период нет завершённых подзадач
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.topOperators} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                        <YAxis dataKey="name" type="category" width={120} fontSize={11} stroke="#475569" />
                        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                        <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">По цехам</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.workshops.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">Нет данных по цехам за период</p>
                  ) : (
                    <div className="space-y-2">
                      {data.workshops.map((w: any, idx: number) => {
                        const max = data.workshops[0].count || 1;
                        const pct = (w.count / max) * 100;
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                              <span className="font-medium">{w.name}</span>
                              <span>{w.count}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent = "orange" }: any) {
  const colors: Record<string, { bg: string; text: string }> = {
    orange: { bg: "bg-orange-50", text: "text-orange-600" },
    green:  { bg: "bg-emerald-50", text: "text-emerald-600" },
    blue:   { bg: "bg-blue-50", text: "text-blue-600" },
    purple: { bg: "bg-purple-50", text: "text-purple-600" },
  };
  const c = colors[accent] ?? colors.orange;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.bg}`}>
            <Icon className={`h-5 w-5 ${c.text}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-base font-semibold text-slate-800 truncate">{value}</p>
            {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
