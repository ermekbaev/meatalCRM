"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "week",    label: "Неделя" },
  { value: "month",   label: "Месяц" },
  { value: "quarter", label: "Квартал" },
  { value: "year",    label: "Год" },
  { value: "all",     label: "Всё время" },
];

export function PeriodFilter({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1" suppressHydrationWarning>
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => select(p.value)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            current === p.value
              ? "bg-white shadow text-slate-800"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
