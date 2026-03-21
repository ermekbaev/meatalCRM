"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Стальные оттенки
const COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1"];

interface Props {
  statusData: { name: string; value: number }[];
}

export function DashboardCharts({ statusData }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm h-full">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
          Распределение по статусам
        </p>
      </div>
      <div className="p-5">
        {statusData.length > 0 && statusData.some((d) => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={105}
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
                wrapperStyle={{ fontSize: "12px", color: "#64748b", paddingTop: "16px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-60 flex-col items-center justify-center gap-3">
            <div className="h-20 w-20 rounded-full border-[3px] border-dashed border-slate-200" />
            <p className="text-[12px] text-slate-400">Нет данных для отображения</p>
          </div>
        )}
      </div>
    </div>
  );
}
