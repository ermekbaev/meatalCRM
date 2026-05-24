"use client";
import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { ArrowLeft, Building2, User, Mail, Phone, Hash } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

type PortalRequest = {
  id: string;
  number: number;
  title: string;
  status: "NEW" | "IN_PROGRESS" | "READY";
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
  clientPositions: { id: string; name: string; unit: string; createdAt: Date | string }[];
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

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-slate-800">Пользователь кабинета</h2>
            </div>
            {company.portalUsers.length === 0 ? (
              <p className="text-sm text-slate-400">Пользователь не привязан</p>
            ) : (
              company.portalUsers.map((u) => (
                <div key={u.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-slate-900">{u.name}</p>
                    {u.isBlocked && (
                      <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-200">
                        заблокирован
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{u.email}</p>
                  {u.phone && <p className="text-sm text-slate-600">{u.phone}</p>}
                </div>
              ))
            )}
          </div>

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
          <div className="space-y-2">
            {company.portalRequests.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                Заявок из кабинета пока нет
              </div>
            ) : (
              company.portalRequests.map((r) => (
                <Link
                  key={r.id}
                  href={`/companies/${company.id}/requests/${r.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">#{r.number}</span>
                        <span
                          className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_COLORS[r.status])}
                        >
                          {STATUS_LABELS[r.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900 truncate">{r.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {r.createdByUser.name} · {r._count.items} позиций · {r._count.comments} комм. · {r._count.files} файл.
                      </p>
                    </div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">{formatDate(r.createdAt as any)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {company.clientPositions.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                Номенклатура ещё не создана
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {company.clientPositions.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-800">{p.name}</span>
                    <span className="text-xs text-slate-500">{p.unit}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
