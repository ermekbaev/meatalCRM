import { cn } from "@/lib/utils";

/**
 * Пустое состояние с рисунком (22.11, Адилет: «красоту сделай»): SVG в оранжевом цвете бренда.
 * kind выбирает сюжет: requests, tasks, invoices, warehouse, clients, generic.
 */
export type EmptyKind = "requests" | "tasks" | "invoices" | "warehouse" | "clients" | "generic";

const O = "#f65022";
const SOFT = "#ffe4da";
const L = { fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Art({ kind }: { kind: EmptyKind }) {
  return (
    <svg viewBox="0 0 160 120" className="h-full w-full" aria-hidden="true">
      <ellipse cx="80" cy="104" rx="52" ry="8" fill={O} opacity=".12" />
      <circle cx="80" cy="58" r="44" fill="#fff1ec" />
      {kind === "requests" && (
        <g>
          <rect x="50" y="28" width="60" height="70" rx="8" fill="#fff" stroke={O} strokeWidth="2" />
          <rect x="66" y="22" width="28" height="12" rx="5" fill={SOFT} stroke={O} strokeWidth="2" />
          <path d="M62 52h36M62 64h36M62 76h22" stroke={SOFT} {...L} strokeWidth="4" />
          <circle cx="106" cy="88" r="13" fill={O} />
          <path d="M106 82v12M100 88h12" stroke="#fff" {...L} strokeWidth="3" />
        </g>
      )}
      {kind === "tasks" && (
        <g>
          <rect x="46" y="28" width="68" height="70" rx="9" fill="#fff" stroke={O} strokeWidth="2" />
          <path d="M58 48l5 5 9-10M58 68l5 5 9-10" stroke={O} {...L} strokeWidth="2.6" />
          <path d="M80 48h22M80 68h22M58 86h44" stroke={SOFT} {...L} strokeWidth="4" />
        </g>
      )}
      {kind === "invoices" && (
        <g>
          <path d="M52 26h44l14 14v58H52z" fill="#fff" stroke={O} strokeWidth="2" strokeLinejoin="round" />
          <path d="M96 26v14h14" fill={SOFT} stroke={O} strokeWidth="2" strokeLinejoin="round" />
          <path d="M62 56h38M62 68h38M62 80h20" stroke={SOFT} {...L} strokeWidth="4" />
          <circle cx="106" cy="88" r="13" fill={O} />
          <path d="M101 88h10M106 83v10" stroke="#fff" {...L} strokeWidth="3" />
        </g>
      )}
      {kind === "warehouse" && (
        <g>
          <path d="M40 52l40-20 40 20v46H40z" fill="#fff" stroke={O} strokeWidth="2" strokeLinejoin="round" />
          <rect x="58" y="66" width="44" height="32" rx="3" fill={SOFT} stroke={O} strokeWidth="2" />
          <path d="M58 82h44M80 66v32" stroke={O} {...L} />
        </g>
      )}
      {kind === "clients" && (
        <g>
          <circle cx="80" cy="46" r="15" fill="#fff" stroke={O} strokeWidth="2" />
          <path d="M52 94c0-16 12-26 28-26s28 10 28 26" fill="#fff" stroke={O} strokeWidth="2" />
          <circle cx="46" cy="58" r="10" fill={SOFT} stroke={O} strokeWidth="2" />
          <circle cx="114" cy="58" r="10" fill={SOFT} stroke={O} strokeWidth="2" />
        </g>
      )}
      {kind === "generic" && (
        <g>
          <rect x="46" y="34" width="68" height="56" rx="9" fill="#fff" stroke={O} strokeWidth="2" />
          <path d="M58 52h44M58 64h44M58 76h26" stroke={SOFT} {...L} strokeWidth="4" />
        </g>
      )}
    </svg>
  );
}

export default function EmptyState({
  kind = "generic",
  title,
  hint,
  action,
  compact,
  className,
}: {
  kind?: EmptyKind;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "py-5" : "py-10", className)}>
      <div className={compact ? "h-20 w-28" : "h-28 w-40"}>
        <Art kind={kind} />
      </div>
      <div className="mt-2 text-sm font-medium text-slate-700">{title}</div>
      {hint && <div className="mt-0.5 max-w-xs text-[13px] text-slate-400">{hint}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
