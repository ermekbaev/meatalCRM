"use client";
import { cn } from "@/lib/utils";

/** Строка результата калькулятора: «лейбл — значение», с подсвеченной итоговой строкой. */
export function ResultRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span
        className={cn(
          "text-sm font-medium",
          highlight ? "text-slate-900 font-semibold" : "text-slate-700",
        )}
      >
        {value}
      </span>
    </div>
  );
}
