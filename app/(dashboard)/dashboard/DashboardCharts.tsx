"use client";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const COLORS = ["#F65022", "#f97334", "#fb923c", "#fed7aa"];

interface Props {
  statusData: { name: string; value: number }[];
  revenueData: { month: string; revenue: number }[];
}

export function DashboardCharts({ statusData, revenueData }: Props) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 h-full">
      {/* Выручка по месяцам */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Выручка по месяцам
          </p>
        </div>
        <div className="p-5">
          {revenueData.some((d) => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}к` : v}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#475569",
                    boxShadow: "0 2px 8px 0 rgb(0 0 0 / 0.06)",
                  }}
                  formatter={(v) => [
                    Number(v).toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }),
                    "Выручка",
                  ]}
                />
                <Bar dataKey="revenue" fill="#E84225" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-55 flex-col items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-full border-[3px] border-dashed border-slate-200" />
              <p className="text-xs text-slate-400">Нет завершённых заявок</p>
            </div>
          )}
        </div>
      </div>

      {/* Распределение по статусам */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            По статусам
          </p>
        </div>
        <div className="p-5">
          {statusData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#475569",
                    boxShadow: "0 2px 8px 0 rgb(0 0 0 / 0.06)",
                  }}
                  formatter={(v) => [`${v} шт.`, ""]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", color: "#64748b", paddingTop: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-55 flex-col items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-full border-[3px] border-dashed border-slate-200" />
              <p className="text-xs text-slate-400">Нет данных</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
