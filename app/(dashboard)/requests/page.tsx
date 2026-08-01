"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PRODUCTION_FIELDS, formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Search, Trash2, Eye, Download, Loader2, Factory, Check } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

// Статус-табы над списком заявок: «Все», по каждому статусу и отдельно «Не оплачено».
// «Согласование» = PENDING_APPROVAL; порядок соответствует жизненному циклу заявки.
const STATUS_TAB_KEYS = ["NEW", "PENDING_APPROVAL", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"] as const;
type RequestTab = "ALL" | (typeof STATUS_TAB_KEYS)[number] | "UNPAID";

// Соответствует ли заявка выбранному табу. «Не оплачено» = всё, кроме «Оплачено».
function matchesTab(r: any, tab: RequestTab): boolean {
  if (tab === "ALL") return true;
  if (tab === "UNPAID") return r.paymentStatus !== "PAID";
  return r.status === tab;
}

// Кликабельная плашка-переключатель для быстрых отметок в списке (отгрузка, счёт).
function FlagToggle({
  active, onLabel, offLabel, updating, onToggle,
}: {
  active: boolean;
  onLabel: string;
  offLabel: string;
  updating: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      disabled={updating}
      className={`inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        active
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
      title={active ? "Нажмите, чтобы снять отметку" : "Нажмите, чтобы отметить"}
    >
      {updating ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : active ? (
        <Check className="h-3 w-3" />
      ) : null}
      {active ? onLabel : offLabel}
    </button>
  );
}

// Обёртка для широкой таблицы: нативную полосу прокрутки скрываем и рисуем свою,
// прилипающую к нижнему краю экрана, — она видна, пока таблица в поле зрения,
// а не только когда страница домотана до конца списка.
function HorizontalScrollArea({ children }: { children: React.ReactNode }) {
  const barRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    // Table из shadcn сам оборачивает <table> в div с overflow-auto — прокручивается именно он.
    const scroller = wrapRef.current?.firstElementChild as HTMLElement | undefined;
    const bar = barRef.current;
    if (!scroller || !bar) return;
    scroller.classList.add("hscroll-hidden");

    const measure = () => {
      setContentWidth(scroller.scrollWidth);
      setScrollable(scroller.scrollWidth > scroller.clientWidth + 1);
    };
    measure();

    const onScroller = () => { bar.scrollLeft = scroller.scrollLeft; };
    const onBar = () => { scroller.scrollLeft = bar.scrollLeft; };
    scroller.addEventListener("scroll", onScroller);
    bar.addEventListener("scroll", onBar);

    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    if (scroller.firstElementChild) ro.observe(scroller.firstElementChild);

    return () => {
      scroller.removeEventListener("scroll", onScroller);
      bar.removeEventListener("scroll", onBar);
      ro.disconnect();
    };
  }, [children]);

  return (
    <div className="hidden md:block">
      <div ref={wrapRef} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {children}
      </div>
      <div
        ref={barRef}
        className={`hscroll-visible sticky bottom-0 z-20 h-[18px] overflow-x-auto overflow-y-hidden border-t border-gray-200 bg-white pt-1 shadow-[0_-2px_6px_rgba(15,23,42,0.06)] ${
          scrollable ? "block" : "hidden"
        }`}
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
    </div>
  );
}

// Свёрнутая ячейка «Производство»: иконка с N/total, popover со всеми статусами заявки
function ProductionSummaryCell({ request }: { request: any }) {
  const filled = PRODUCTION_FIELDS.filter((f) => Boolean(request?.[f.key])).length;
  const total = PRODUCTION_FIELDS.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 transition-colors ${
            filled === 0
              ? "bg-slate-50 text-slate-400 ring-slate-200 hover:bg-slate-100"
              : "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100"
          }`}
          title="Производственные статусы"
        >
          <Factory className="h-3.5 w-3.5" />
          <span>{filled}/{total}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Производство
        </div>
        <div className="space-y-1">
          {PRODUCTION_FIELDS.map((f) => {
            const value = request?.[f.key] ?? null;
            const opt = value ? f.options.find((o) => o.value === value) : null;
            return (
              <div key={f.key} className="flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-slate-50">
                <span className="text-xs text-slate-600">{f.label}</span>
                {opt ? (
                  <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium ${opt.className}`}>
                    {opt.label}
                  </span>
                ) : (
                  <span className="inline-flex h-5 items-center rounded-full bg-slate-50 px-2 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200">
                    не указано
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RequestsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAssigneeRole = role === "FOREMAN" || role === "ENGINEER";
  const canManageRequests = role === "ADMIN" || role === "MANAGER";
  const [requests, setRequests] = useState<any[]>([]);
  // Активный статус-таб. Предзаполняем из URL (?status=NEW — переход с дашборда):
  // если пришёл ровно один известный статус, открываем соответствующий таб.
  const [tab, setTab] = useState<RequestTab>(() => {
    const s = searchParams.get("status");
    if (s && (STATUS_TAB_KEYS as readonly string[]).includes(s)) return s as RequestTab;
    return "ALL";
  });
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [assigneeId, setAssigneeId] = useState("ALL");
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);

  // Загрузить список менеджеров/сотрудников для фильтра один раз при монтировании.
  const managersLoaded = useRef(false);
  useEffect(() => {
    if (managersLoaded.current) return;
    managersLoaded.current = true;
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const relevant = data
          .filter((u) => u.role === "ADMIN" || u.role === "MANAGER")
          .map((u) => ({ id: u.id, name: u.name }))
          .sort((a, b) => a.name.localeCompare(b.name, "ru"));
        setManagers(relevant);
      })
      .catch(() => {});
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (priority && priority !== "ALL") params.set("priority", priority);
    if (paymentStatus && paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);
    if (assigneeId && assigneeId !== "ALL") params.set("assigneeId", assigneeId);
    const res = await fetch(`/api/requests?${params}`);
    const data = await res.json();
    setRequests(data);
    setLoading(false);
  }, [search, priority, paymentStatus, assigneeId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handlePaymentChange = async (id: string, value: string) => {
    setUpdatingPayment(id);
    await fetch(`/api/requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: value }),
    });
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, paymentStatus: value } : r));
    setUpdatingPayment(null);
  };

  const handleStatusChange = async (id: string, value: string) => {
    setUpdatingStatus(id);
    await fetch(`/api/requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: value } : r));
    setUpdatingStatus(null);
  };

  // Быстрые отметки «Отгружено» / «Счёт выставлен» кликом в списке.
  const handleFlagToggle = async (id: string, flag: "shipped" | "invoiceIssued", next: boolean) => {
    setUpdatingFlag(`${id}:${flag}`);
    await fetch(`/api/requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [flag]: next }),
    });
    const field = flag === "shipped" ? "shippedAt" : "invoiceIssuedAt";
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, [field]: next ? new Date().toISOString() : null } : r));
    setUpdatingFlag(null);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/requests/${id}`, { method: "DELETE" });
    fetchRequests();
  };

  const handleExport = () => {
    const rows = visibleRequests.map((r) => ({
      "№": r.number,
      "Название": r.title,
      "Клиент": (r.client?.shortName || r.client?.name) ?? "",
      "Статус": REQUEST_STATUS_LABELS[r.status],
      "Приоритет": PRIORITY_LABELS[r.priority],
      "Сумма": r.amount ?? "",
      "Ответственный": r.assignee?.name ?? "",
      "Автор": r.createdBy?.name ?? "",
      "Дата": new Date(r.createdAt).toLocaleDateString("ru"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Заявки");
    XLSX.writeFile(wb, "requests.xlsx");
  };

  // Список под активный статус-таб + счётчики для бейджей на вкладках.
  const visibleRequests = requests.filter((r) => matchesTab(r, tab));
  const tabCount = (t: RequestTab) => requests.filter((r) => matchesTab(r, t)).length;

  return (
    <div>
      <Header title="Заявки" />
      <div className="p-4 lg:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-50 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-40 min-w-0">
              <SelectValue placeholder="Приоритет" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все приоритеты</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-40 min-w-0">
              <SelectValue placeholder="Оплата" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Вся оплата</SelectItem>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isAssigneeRole && managers.length > 0 && (
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-44 min-w-0">
                <SelectValue placeholder="Менеджер" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все менеджеры</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex w-full sm:w-auto sm:ml-auto gap-2">
            {!isAssigneeRole && (
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Excel
              </Button>
            )}
            {canManageRequests && (
              <Button className="flex-1 sm:flex-none" onClick={() => router.push("/requests/new")}>
                <Plus className="mr-2 h-4 w-4" /> Создать
              </Button>
            )}
          </div>
        </div>

        {/* Статус-табы: Все + по каждому статусу + «Не оплачено». Скроллятся по горизонтали. */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {([
            { key: "ALL", label: "Все" },
            ...STATUS_TAB_KEYS.map((k) => ({ key: k, label: REQUEST_STATUS_LABELS[k] })),
            { key: "UNPAID", label: "Не оплачено" },
          ] as { key: RequestTab; label: string }[]).map((t) => {
            const count = tabCount(t.key);
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      active
                        ? "bg-orange-100 text-orange-700"
                        : t.key === "UNPAID"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">Загрузка...</div>
          ) : visibleRequests.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">Заявки не найдены</div>
          ) : visibleRequests.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/requests/${r.id}`} className="font-medium text-gray-900 text-sm block truncate">
                    {r.title}
                  </Link>
                  <p className="text-xs text-gray-500 truncate">{r.client?.shortName || r.client?.name}</p>
                </div>
                <span className="font-mono text-[11px] text-gray-400 shrink-0">#{r.number}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${REQUEST_STATUS_COLORS[r.status]}`}>
                  {REQUEST_STATUS_LABELS[r.status]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[r.priority]}`}>
                  {PRIORITY_LABELS[r.priority]}
                </span>
                {r.paymentStatus && r.paymentStatus !== "NONE" && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PAYMENT_STATUS_COLORS[r.paymentStatus]}`}>
                    {PAYMENT_STATUS_LABELS[r.paymentStatus]}
                  </span>
                )}
                <FlagToggle
                  active={!!r.shippedAt}
                  onLabel="Отгружено"
                  offLabel="Не отгружено"
                  updating={updatingFlag === `${r.id}:shipped`}
                  onToggle={(next) => handleFlagToggle(r.id, "shipped", next)}
                />
                <FlagToggle
                  active={!!r.invoiceIssuedAt}
                  onLabel="Счёт выставлен"
                  offLabel="Счёт не выставлен"
                  updating={updatingFlag === `${r.id}:invoiceIssued`}
                  onToggle={(next) => handleFlagToggle(r.id, "invoiceIssued", next)}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500 min-w-0 flex-1 truncate">
                  <span className="font-medium text-gray-800">{r.amount ? formatCurrency(r.amount) : "—"}</span>
                  <span className="mx-1.5">·</span>
                  <span>{formatDate(r.createdAt)}</span>
                  {r.assignee?.name && <><span className="mx-1.5">·</span><span title="Ответственный">{r.assignee.name}</span></>}
                  {r.createdBy?.name && r.createdBy.id !== r.assignee?.id && (
                    <><span className="mx-1.5">·</span><span className="text-gray-400" title="Автор">авт. {r.createdBy.name}</span></>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => router.push(`/requests/${r.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canManageRequests && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
                        <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(r.id)}>Удалить</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <HorizontalScrollArea>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-16">№</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Оплата</TableHead>
                <TableHead className="whitespace-nowrap">Отгрузка</TableHead>
                <TableHead className="whitespace-nowrap">Счёт</TableHead>
                <TableHead>Приоритет</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead className="whitespace-nowrap">Производство</TableHead>
                <TableHead>Ответственный</TableHead>
                <TableHead>Автор</TableHead>
                <TableHead className="whitespace-nowrap">Счёт 1С</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={15} className="text-center py-8 text-gray-400">Загрузка...</TableCell></TableRow>
              ) : visibleRequests.length === 0 ? (
                <TableRow><TableCell colSpan={15} className="text-center py-8 text-gray-400">Заявки не найдены</TableCell></TableRow>
              ) : (
                visibleRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-gray-500">#{r.number}</TableCell>
                    <TableCell>
                      <div>
                        <Link href={`/requests/${r.id}`} className="font-medium text-gray-900 hover:text-orange-600 transition-colors">
                          {r.title}
                        </Link>
                        {r._count?.comments > 0 && (
                          <p className="text-xs text-gray-400">{r._count.comments} комм.</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{r.client?.shortName || r.client?.name}</TableCell>
                    <TableCell>
                      {updatingStatus === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <Select value={r.status} onValueChange={(v) => handleStatusChange(r.id, v)}>
                          <SelectTrigger className={`h-7 w-36 text-xs border-0 shadow-none px-2.5 rounded-full font-medium ${REQUEST_STATUS_COLORS[r.status]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {updatingPayment === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <Select value={r.paymentStatus ?? "NONE"} onValueChange={(v) => handlePaymentChange(r.id, v)}>
                          <SelectTrigger className={`h-7 w-36 text-xs border-0 shadow-none px-2.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[r.paymentStatus] || "bg-gray-100 text-gray-500"}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <FlagToggle
                        active={!!r.shippedAt}
                        onLabel="Отгружено"
                        offLabel="Не отгружено"
                        updating={updatingFlag === `${r.id}:shipped`}
                        onToggle={(next) => handleFlagToggle(r.id, "shipped", next)}
                      />
                    </TableCell>
                    <TableCell>
                      <FlagToggle
                        active={!!r.invoiceIssuedAt}
                        onLabel="Выставлен"
                        offLabel="Не выставлен"
                        updating={updatingFlag === `${r.id}:invoiceIssued`}
                        onToggle={(next) => handleFlagToggle(r.id, "invoiceIssued", next)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_COLORS[r.priority]}`}>
                        {PRIORITY_LABELS[r.priority]}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{r.amount ? formatCurrency(r.amount) : "—"}</TableCell>
                    <TableCell>
                      <ProductionSummaryCell request={r} />
                    </TableCell>
                    <TableCell className="text-gray-600">{r.assignee?.name ?? "—"}</TableCell>
                    <TableCell className="text-gray-500 text-xs">{r.createdBy?.name ?? "—"}</TableCell>
                    <TableCell className="text-gray-600 text-xs whitespace-nowrap">{r.invoiceNumber1c || "—"}</TableCell>
                    <TableCell className="text-gray-500">{formatDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => router.push(`/requests/${r.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManageRequests && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
                                <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(r.id)}>Удалить</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </HorizontalScrollArea>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense>
      <RequestsPageInner />
    </Suspense>
  );
}
