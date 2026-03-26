import { formatCurrency } from "@/lib/utils";

interface TopItem {
  name: string;
  _count: { name: number };
  _sum: { total: number | null };
}

interface PopularItemsCardProps {
  items: TopItem[];
}

export function PopularItemsCard({ items }: PopularItemsCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Популярные позиции</p>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-slate-400">Нет данных по позициям</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {items.map((item, index) => (
            <div key={item.name} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-800">{item.name}</p>
                <p className="text-[11px] text-slate-400">{item._count.name} заявок</p>
              </div>
              <span className="shrink-0 text-[13px] font-semibold text-slate-700">
                {formatCurrency(item._sum.total ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
