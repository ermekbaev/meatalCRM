"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Building2, User, Mail, Phone, Hash, Search } from "lucide-react";
import { formatDate, formatCurrency, cn, PORTAL_PAYMENT_OPTIONS, type PortalPaymentStatus } from "@/lib/utils";
import { PortalUsersCard } from "./PortalUsersCard";

type PortalRequest = {
  id: string;
  number: number;
  title: string;
  status: "NEW" | "IN_PROGRESS" | "READY";
  paymentStatus: PortalPaymentStatus;
  firstViewedAt: Date | string | null;
  createdAt: Date | string;
  createdByUser: { id: string; name: string };
  _count: { items: number; comments: number; files: number };
};

type Company = {
  id: string;
  name: string;
  inn: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date | string;
  manager: { id: string; name: string; email: string } | null;
  portalUsers: { id: string; name: string; email: string; phone: string | null; isBlocked: boolean; createdAt: Date | string }[];
  portalRequests: PortalRequest[];
  clientPositions: { id: string; name: string; unit: string; price: number | null; folderId: string | null; createdAt: Date | string }[];
  clientPositionFolders: { id: string; name: string }[];
};

const STATUS_LABELS: Record<PortalRequest["status"], string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  READY: "Готова",
};
const STATUS_COLORS: Record<PortalRequest["status"], string> = {
  NEW: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
};

export function CompanyDetail({ company }: { company: Company }) {
  const [tab, setTab] = useState<"requests" | "positions">("requests");

  // Фильтры по списку заявок компании — клиентские, заявок у одной компании
  // не миллион. Аналогично главной портала.
  const [reqSearch, setReqSearch] = useState("");
  const [reqStatus, setReqStatus] = useState<"ALL" | PortalRequest["status"]>("ALL");
  const [reqPayment, setReqPayment] = useState<"ALL" | PortalPaymentStatus | "UNREAD">("ALL");

  const filteredRequests = useMemo(() => {
    const q = reqSearch.trim().toLowerCase();
    return company.portalRequests.filter((r) => {
      if (reqStatus !== "ALL" && r.status !== reqStatus) return false;
      if (reqPayment === "UNREAD") {
        if (r.firstViewedAt !== null) return false;
      } else if (reqPayment !== "ALL" && r.paymentStatus !== reqPayment) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        String(r.number).includes(q) ||
        r.createdByUser.name.toLowerCase().includes(q)
      );
    });
  }, [company.portalRequests, reqSearch, reqStatus, reqPayment]);

  const hasFilters = reqSearch.trim() !== "" || reqStatus !== "ALL" || reqPayment !== "ALL";

  return (
    <div>
      <Header title={company.name} subtitle="Кабинет клиента" />
      <div className="p-4 lg:p-6 space-y-6">
        <Link href="/companies" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> К списку
        </Link>

        {/* Карточки: компания / пользователь / менеджер */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-slate-800">Компания</h2>
            </div>
            <p className="text-base font-medium text-slate-900">{company.name}</p>
            <dl className="mt-3 space-y-1.5 text-sm text-slate-600">
              {company.inn && (
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-slate-400" />
                  <span>ИНН: {company.inn}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{company.email}</span>
                </div>
              )}
              <div className="text-xs text-slate-400 pt-1">создан {formatDate(company.createdAt as any)}</div>
            </dl>
          </div>

          <PortalUsersCard companyId={company.id} users={company.portalUsers} />

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-slate-800">Ответственный менеджер</h2>
            </div>
            {company.manager ? (
              <div>
                <p className="text-base font-medium text-slate-900">{company.manager.name}</p>
                <p className="text-sm text-slate-600">{company.manager.email}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Менеджер не назначен</p>
            )}
          </div>
        </div>

        {/* Табы */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-1">
            <button
              onClick={() => setTab("requests")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "requests"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Заявки ({company.portalRequests.length})
            </button>
            <button
              onClick={() => setTab("positions")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "positions"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Номенклатура ({company.clientPositions.length})
            </button>
          </nav>
        </div>

        {tab === "requests" ? (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  placeholder="Поиск по названию, номеру или автору..."
                  className="pl-9"
                />
              </div>
              <Select value={reqStatus} onValueChange={(v) => setReqStatus(v as "ALL" | PortalRequest["status"])}>
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
              <Select value={reqPayment} onValueChange={(v) => setReqPayment(v as "ALL" | PortalPaymentStatus | "UNREAD")}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Оплата" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Любая оплата</SelectItem>
                  <SelectItem value="UNREAD">Только новые (непрочитанные)</SelectItem>
                  {PORTAL_PAYMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {company.portalRequests.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                Заявок из кабинета пока нет
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                {hasFilters ? "Ничего не найдено по выбранным фильтрам" : "Заявок из кабинета пока нет"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRequests.map((r) => {
                  const payOpt = PORTAL_PAYMENT_OPTIONS.find((o) => o.value === r.paymentStatus) ?? PORTAL_PAYMENT_OPTIONS[0];
                  const unread = r.firstViewedAt === null;
                  return (
                    <Link
                      key={r.id}
                      href={`/companies/${company.id}/requests/${r.id}`}
                      className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-400">#{r.number}</span>
                            <span
                              className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_COLORS[r.status])}
                            >
                              {STATUS_LABELS[r.status]}
                            </span>
                            {r.paymentStatus !== "NONE" && (
                              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", payOpt.className)}>
                                {payOpt.label}
                              </span>
                            )}
                            {unread && (
                              <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                новая
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-900 truncate">{r.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {r.createdByUser.name} · {r._count.items} позиций · {r._count.comments} комм. · {r._count.files} файл.
                          </p>
                        </div>
                        <div className="text-xs text-slate-400 whitespace-nowrap">{formatDate(r.createdAt as any)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {company.clientPositions.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                Номенклатура ещё не создана
              </div>
            ) : (
              (() => {
                // Группируем позиции по папке. Сначала «без папки», затем — по папкам.
                const byFolder = new Map<string | null, typeof company.clientPositions>();
                for (const p of company.clientPositions) {
                  const key = p.folderId ?? null;
                  const arr = byFolder.get(key) ?? [];
                  arr.push(p);
                  byFolder.set(key, arr);
                }
                const groups: { key: string | null; label: string | null; items: typeof company.clientPositions }[] = [];
                const noFolder = byFolder.get(null);
                if (noFolder && noFolder.length) groups.push({ key: null, label: null, items: noFolder });
                for (const f of company.clientPositionFolders) {
                  const items = byFolder.get(f.id);
                  if (items && items.length) groups.push({ key: f.id, label: f.name, items });
                }
                return (
                  <div className="divide-y divide-slate-100">
                    {groups.map((g) => (
                      <div key={g.key ?? "__none__"}>
                        {g.label && (
                          <div className="bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {g.label}
                          </div>
                        )}
                        <ul className="divide-y divide-slate-100">
                          {g.items.map((p) => (
                            <li key={p.id} className="flex items-center justify-between px-4 py-3">
                              <span className="text-sm text-slate-800">{p.name}</span>
                              <span className="text-xs text-slate-500 whitespace-nowrap">
                                {p.unit}
                                {p.price != null && <> · {formatCurrency(p.price)}</>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
