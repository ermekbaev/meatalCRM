"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Package, Check } from "lucide-react";
import { formatDate, PORTAL_PAYMENT_OPTIONS, PORTAL_PRIORITY_OPTIONS, type PortalPaymentStatus, type PortalPriority } from "@/lib/utils";

type Status = "NEW" | "IN_PROGRESS" | "READY";
type Request = {
  id: string;
  number: number;
  title: string;
  status: Status;
  priority: PortalPriority;
  paymentStatus: PortalPaymentStatus;
  shippedAt: Date | string | null;
  acceptedAt: Date | string | null;
  createdAt: Date | string;
  _count: { items: number; comments: number; files: number };
};

const STATUS_LABELS: Record<Status, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  READY: "Готова",
};
const STATUS_COLORS: Record<Status, string> = {
  NEW: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
};

/**
 * Список своих заявок в портале с фильтрами. Фильтрация клиентская:
 * у одной компании заявок не так много, чтобы городить серверную пагинацию.
 */
export function PortalRequestsList({ requests }: { requests: Request[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | Status>("ALL");
  const [payment, setPayment] = useState<"ALL" | PortalPaymentStatus>("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (status !== "ALL" && r.status !== status) return false;
      if (payment !== "ALL" && r.paymentStatus !== payment) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        String(r.number).includes(q)
      );
    });
  }, [requests, search, status, payment]);

  const hasFiltersOrSearch = search.trim() !== "" || status !== "ALL" || payment !== "ALL";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Мои заявки</h1>
        <Link href="/portal/requests/new">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Новая заявка
          </Button>
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или номеру..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as "ALL" | Status)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все статусы</SelectItem>
            <SelectItem value="NEW">Новая</SelectItem>
            <SelectItem value="IN_PROGRESS">В работе</SelectItem>
            <SelectItem value="READY">Готова</SelectItem>
          </SelectContent>
        </Select>
        <Select value={payment} onValueChange={(v) => setPayment(v as "ALL" | PortalPaymentStatus)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Оплата" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Любая оплата</SelectItem>
            {PORTAL_PAYMENT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          {hasFiltersOrSearch ? (
            <p className="text-sm text-slate-500">Ничего не найдено по выбранным фильтрам</p>
          ) : (
            <>
              <p className="text-sm text-slate-500">У вас пока нет заявок</p>
              <Link href="/portal/requests/new" className="mt-3 inline-block">
                <Button>Создать первую</Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="md:hidden grid gap-2 sm:grid-cols-2">
            {filtered.map((r) => {
              const payOpt = PORTAL_PAYMENT_OPTIONS.find((o) => o.value === r.paymentStatus) ?? PORTAL_PAYMENT_OPTIONS[0];
              return (
                <li key={r.id}>
                  <Link
                    href={`/portal/requests/${r.id}`}
                    className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 hover:border-orange-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400">#{r.number}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[r.status]}`}>
                            {STATUS_LABELS[r.status]}
                          </span>
                          {r.priority !== "NORMAL" && (() => {
                            const pOpt = PORTAL_PRIORITY_OPTIONS.find((o) => o.value === r.priority);
                            return pOpt ? (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${pOpt.className}`}>
                                {pOpt.label}
                              </span>
                            ) : null;
                          })()}
                          {r.paymentStatus !== "NONE" && (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${payOpt.className}`}>
                              {payOpt.label}
                            </span>
                          )}
                          {r.shippedAt && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                              <Package className="h-3 w-3" /> Отгружено
                            </span>
                          )}
                          {r.acceptedAt && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              <Check className="h-3 w-3" /> Принято
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900 line-clamp-2">{r.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {r._count.items} позиций · {r._count.comments} комм. · {r._count.files} файл.
                        </p>
                      </div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-14">№</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Приоритет</TableHead>
                  <TableHead>Оплата</TableHead>
                  <TableHead className="text-center">Позиций</TableHead>
                  <TableHead className="text-center">Комм.</TableHead>
                  <TableHead className="text-center">Файлы</TableHead>
                  <TableHead>Метки</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const payOpt = PORTAL_PAYMENT_OPTIONS.find((o) => o.value === r.paymentStatus) ?? PORTAL_PAYMENT_OPTIONS[0];
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/60">
                      <TableCell className="font-mono text-slate-400 text-xs">#{r.number}</TableCell>
                      <TableCell>
                        <Link
                          href={`/portal/requests/${r.id}`}
                          className="font-medium text-slate-900 hover:text-orange-600 transition-colors"
                        >
                          {r.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_COLORS[r.status]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const pOpt = PORTAL_PRIORITY_OPTIONS.find((o) => o.value === r.priority) ?? PORTAL_PRIORITY_OPTIONS[1];
                          return (
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${pOpt.className}`}>
                              {pOpt.label}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {r.paymentStatus !== "NONE" ? (
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${payOpt.className}`}>
                            {payOpt.label}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">{r._count.items}</TableCell>
                      <TableCell className="text-center text-sm text-slate-600">{r._count.comments}</TableCell>
                      <TableCell className="text-center text-sm text-slate-600">{r._count.files}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {r.shippedAt && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                              <Package className="h-3 w-3" /> Отгружено
                            </span>
                          )}
                          {r.acceptedAt && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              <Check className="h-3 w-3" /> Принято
                            </span>
                          )}
                          {!r.shippedAt && !r.acceptedAt && <span className="text-slate-400 text-xs">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 whitespace-nowrap">{formatDate(r.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
