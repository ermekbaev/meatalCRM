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
import {
  ArrowLeft, Building2, User, Mail, Phone, Hash, Search,
  Package, Check, FileText, Pencil, Trash2, X, Save,
} from "lucide-react";
import { formatDate, formatCurrency, cn, PORTAL_PAYMENT_OPTIONS, PORTAL_PRIORITY_OPTIONS, type PortalPaymentStatus, type PortalPriority } from "@/lib/utils";
import { PortalUsersCard } from "./PortalUsersCard";

type PortalRequest = {
  id: string;
  number: number;
  title: string;
  status: "NEW" | "IN_PROGRESS" | "READY";
  priority: PortalPriority;
  paymentStatus: PortalPaymentStatus;
  shippedAt: Date | string | null;
  acceptedAt: Date | string | null;
  firstViewedAt: Date | string | null;
  createdAt: Date | string;
  createdByUser: { id: string; name: string };
  _count: { items: number; comments: number; files: number };
};

type PositionFile = { id: string; filename: string; originalName: string; size: number; kind: string };
type Position = {
  id: string;
  name: string;
  unit: string;
  price: number | null;
  folderId: string | null;
  createdAt: Date | string;
  files: PositionFile[];
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
  clientPositions: Position[];
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

export function CompanyDetail({ company, role }: { company: Company; role: "ADMIN" | "MANAGER" }) {
  const [tab, setTab] = useState<"requests" | "positions">("requests");

  // ── Заявки ──────────────────────────────────────────────────────────────────
  const [reqSearch, setReqSearch] = useState("");
  const [reqStatus, setReqStatus] = useState<"ALL" | PortalRequest["status"]>("ALL");
  const [reqPayment, setReqPayment] = useState<"ALL" | PortalPaymentStatus | "UNREAD">("ALL");
  const [portalRequests, setPortalRequests] = useState<PortalRequest[]>(company.portalRequests);
  const [deletingReqId, setDeletingReqId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    const q = reqSearch.trim().toLowerCase();
    return portalRequests.filter((r) => {
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
  }, [portalRequests, reqSearch, reqStatus, reqPayment]);

  async function deletePortalRequest(id: string) {
    if (!confirm("Удалить портальную заявку? Это действие необратимо.")) return;
    setDeletingReqId(id);
    try {
      const res = await fetch(`/api/portal/requests/${id}`, { method: "DELETE" });
      if (res.ok) setPortalRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingReqId(null);
    }
  }

  const hasFilters = reqSearch.trim() !== "" || reqStatus !== "ALL" || reqPayment !== "ALL";

  // ── Номенклатура ─────────────────────────────────────────────────────────────
  const [positions, setPositions] = useState<Position[]>(company.clientPositions);
  const [posSearch, setPosSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", unit: "шт", price: "", folderId: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPositions = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter((p) => p.name.toLowerCase().includes(q));
  }, [positions, posSearch]);

  function startEdit(p: Position) {
    setEditId(p.id);
    setEditForm({
      name: p.name,
      unit: p.unit,
      price: p.price != null ? String(p.price) : "",
      folderId: p.folderId ?? "",
    });
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/positions/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim() || " ",
          unit: editForm.unit.trim() || "шт",
          price: editForm.price !== "" ? Number(editForm.price) : null,
          folderId: editForm.folderId || null,
        }),
      });
      if (!res.ok) return;
      const updated: Position = await res.json();
      setPositions((prev) => prev.map((p) => (p.id === editId ? updated : p)));
      setEditId(null);
    } finally {
      setSaving(false);
    }
  }

  async function deletePosition(id: string) {
    if (!confirm("Удалить позицию?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/companies/${company.id}/positions/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setPositions((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  // Группировка по папкам (используем filteredPositions для поиска)
  function buildGroups(items: Position[]) {
    const byFolder = new Map<string | null, Position[]>();
    for (const p of items) {
      const key = p.folderId ?? null;
      const arr = byFolder.get(key) ?? [];
      arr.push(p);
      byFolder.set(key, arr);
    }
    const groups: { key: string | null; label: string | null; items: Position[] }[] = [];
    const noFolder = byFolder.get(null);
    if (noFolder?.length) groups.push({ key: null, label: null, items: noFolder });
    for (const f of company.clientPositionFolders) {
      const its = byFolder.get(f.id);
      if (its?.length) groups.push({ key: f.id, label: f.name, items: its });
    }
    return groups;
  }

  return (
    <div>
      <Header title={company.name} subtitle="Кабинет клиента" />
      <div className="p-4 lg:p-6 space-y-6">
        <Link href="/companies" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> К списку
        </Link>

        {/* Карточки: компания / пользователи / менеджер */}
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
              Номенклатура ({positions.length})
            </button>
          </nav>
        </div>

        {/* ── Вкладка Заявки ───────────────────────────────────────────────────── */}
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
                  const prioOpt = PORTAL_PRIORITY_OPTIONS.find((o) => o.value === r.priority) ?? PORTAL_PRIORITY_OPTIONS[1];
                  const unread = r.firstViewedAt === null;
                  return (
                    <div key={r.id} className="relative rounded-xl border border-gray-200 bg-white p-4 hover:border-orange-300 transition-colors">
                      <Link href={`/companies/${company.id}/requests/${r.id}`} className="block">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-slate-400">#{r.number}</span>
                              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_COLORS[r.status])}>
                                {STATUS_LABELS[r.status]}
                              </span>
                              {r.priority !== "NORMAL" && (
                                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", prioOpt.className)}>
                                  {prioOpt.label}
                                </span>
                              )}
                              {r.paymentStatus !== "NONE" && (
                                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", payOpt.className)}>
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
                      <button
                        type="button"
                        onClick={() => deletePortalRequest(r.id)}
                        disabled={deletingReqId === r.id}
                        className="absolute right-3 bottom-3 p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Удалить заявку"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── Вкладка Номенклатура ──────────────────────────────────────────── */
          <div className="space-y-3">
            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                placeholder="Поиск по названию позиции..."
                className="pl-9"
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {positions.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">Номенклатура ещё не создана</div>
              ) : filteredPositions.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">Ничего не найдено</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {buildGroups(filteredPositions).map((g) => (
                    <div key={g.key ?? "__none__"}>
                      {g.label && (
                        <div className="bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                          {g.label}
                        </div>
                      )}
                      <ul className="divide-y divide-slate-100">
                        {g.items.map((p) =>
                          editId === p.id ? (
                            /* ── Строка редактирования ── */
                            <li key={p.id} className="px-4 py-3 bg-orange-50/50">
                              <div className="flex flex-wrap gap-2 items-center">
                                <Input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                  placeholder="Название"
                                  className="flex-1 min-w-[180px] h-8 text-sm"
                                  autoFocus
                                />
                                <Input
                                  value={editForm.unit}
                                  onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                                  placeholder="ед."
                                  className="w-20 h-8 text-sm"
                                />
                                <Input
                                  type="number"
                                  min={0}
                                  value={editForm.price}
                                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                                  placeholder="Цена"
                                  className="w-28 h-8 text-sm"
                                />
                                {company.clientPositionFolders.length > 0 && (
                                  <Select
                                    value={editForm.folderId}
                                    onValueChange={(v) => setEditForm((f) => ({ ...f, folderId: v === "__none__" ? "" : v }))}
                                  >
                                    <SelectTrigger className="w-40 h-8 text-sm">
                                      <SelectValue placeholder="Без папки" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Без папки</SelectItem>
                                      {company.clientPositionFolders.map((f) => (
                                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                <div className="flex gap-1">
                                  <button
                                    onClick={saveEdit}
                                    disabled={saving || !editForm.name.trim()}
                                    className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                    {saving ? "Сохранение…" : "Сохранить"}
                                  </button>
                                  <button
                                    onClick={() => setEditId(null)}
                                    disabled={saving}
                                    className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </li>
                          ) : (
                            /* ── Строка просмотра ── */
                            <li key={p.id} className="flex items-center justify-between px-4 py-3 gap-2 group">
                              <span className="text-sm text-slate-800 min-w-0 truncate">{p.name}</span>
                              <span className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap shrink-0">
                                {p.unit}
                                {p.price != null && <> · {formatCurrency(p.price)}</>}
                                {p.files?.map((f) => (
                                  <a
                                    key={f.id}
                                    href={`/api/files?key=${encodeURIComponent(f.filename)}&name=${encodeURIComponent(f.originalName)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={f.originalName}
                                    className={f.kind === "DXF" ? "text-violet-500 hover:text-violet-700" : "text-orange-500 hover:text-orange-700"}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </a>
                                ))}
                                {/* Кнопки редактирования для ADMIN/MANAGER */}
                                <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => startEdit(p)}
                                    title="Редактировать"
                                    className="rounded p-1 text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deletePosition(p.id)}
                                    disabled={deletingId === p.id}
                                    title="Удалить"
                                    className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
