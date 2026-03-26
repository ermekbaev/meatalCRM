"use client";
import { useState } from "react";
import { ClipboardList, Users, FileText, TrendingUp } from "lucide-react";
import { RevenueDetailModal } from "@/components/RevenueDetailModal";

const ICONS: Record<string, React.ElementType> = {
  ClipboardList,
  Users,
  FileText,
  TrendingUp,
};

interface StatItem {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
  clickable?: boolean;
}

interface DashboardStatsProps {
  stats: StatItem[];
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const [revenueOpen, setRevenueOpen] = useState(false);

  return (
    <>
      <RevenueDetailModal open={revenueOpen} onClose={() => setRevenueOpen(false)} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = ICONS[s.icon];
          const isClickable = s.clickable === true;
          return (
            <div
              key={s.title}
              className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${isClickable ? "cursor-pointer hover:shadow-md hover:border-teal-200 transition-all" : ""}`}
              onClick={isClickable ? () => setRevenueOpen(true) : undefined}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.title}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-800 tracking-tight">{s.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                  {Icon && <Icon className={`h-5 w-5 ${s.color}`} />}
                </div>
              </div>
              {isClickable && (
                <p className="mt-2 text-[11px] text-teal-500 font-medium">Нажмите для деталей →</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
