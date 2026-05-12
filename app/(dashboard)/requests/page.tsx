"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PRODUCTION_FIELDS, formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Search, Trash2, Eye, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

// Сводный бейдж по производственному полю: показываем агрегат значения по позициям заявки
function aggregateField(items: any[] | undefined, key: string) {
  if (!items || items.length === 0) return null;
  const values = items.map((i) => i?.[key]).filter((v): v is string => Boolean(v));
  if (values.length === 0) return null;
  const unique = Array.from(new Set(values));
  if (unique.length === 1) return unique[0];
  return "MIX";
}

export default function RequestsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAssigneeRole = role === "FOREMAN" || role === "ENGINEER";
  const canManageRequests = role === "ADMIN" || role === "MANAGER";
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "ALL") params.set("status", status);
    if (priority && priority !== "ALL") params.set("priority", priority);
    if (paymentStatus && paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);
    const res = await fetch(`/api/requests?${params}`);
    const data = await res.json();
    setRequests(data);
    setLoading(false);
  }, [search, status, priority, paymentStatus]);

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


  const handleDelete = async (id: string) => {
    await fetch(`/api/requests/${id}`, { method: "DELETE" });
    fetchRequests();
  };

  const handleExport = () => {
    const rows = requests.map((r) => ({
      "№": r.number,
      "Название": r.title,
      "Клиент": (r.client?.shortName || r.client?.name) ?? "",
      "Статус": REQUEST_STATUS_LABELS[r.status],
      "Приоритет": PRIORITY_LABELS[r.priority],
      "Сумма": r.amount ?? "",
      "Ответственный": r.assignee?.name ?? "",
      "Дата": new Date(r.createdAt).toLocaleDateString("ru"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Заявки");
    XLSX.writeFile(wb, "requests.xlsx");
  };

  return (
    <div>
      <Header title="Заявки" />
      <div className="p-4 lg:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-40 min-w-0">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все статусы</SelectItem>
              {Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">Загрузка...</div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">Заявки не найдены</div>
          ) : requests.map((r) => (
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
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500 min-w-0 flex-1">
                  <span className="font-medium text-gray-800">{r.amount ? formatCurrency(r.amount) : "—"}</span>
                  <span className="mx-1.5">·</span>
                  <span>{formatDate(r.createdAt)}</span>
                  {r.assignee?.name && <><span className="mx-1.5">·</span><span className="truncate">{r.assignee.name}</span></>}
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
        <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-16">№</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Оплата</TableHead>
                <TableHead>Приоритет</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead className="whitespace-nowrap">Производство</TableHead>
                <TableHead>Ответственный</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-400">Загрузка...</TableCell></TableRow>
              ) : requests.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-400">Заявки не найдены</TableCell></TableRow>
              ) : (
                requests.map((r) => (
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
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_COLORS[r.priority]}`}>
                        {PRIORITY_LABELS[r.priority]}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{r.amount ? formatCurrency(r.amount) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {PRODUCTION_FIELDS.map((f) => {
                          const agg = aggregateField(r.items, f.key);
                          if (!agg) {
                            return (
                              <span
                                key={f.key}
                                className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-slate-50 px-1.5 text-[10px] font-medium text-slate-300 ring-1 ring-slate-200"
                                title={`${f.label}: не указано`}
                              >
                                {f.short}
                              </span>
                            );
                          }
                          if (agg === "MIX") {
                            return (
                              <span
                                key={f.key}
                                className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-300"
                                title={`${f.label}: разное по позициям`}
                              >
                                {f.short}
                              </span>
                            );
                          }
                          const opt = f.options.find((o) => o.value === agg);
                          return (
                            <span
                              key={f.key}
                              className={`inline-flex h-6 items-center justify-center rounded-full px-2 text-[10px] font-medium ${opt?.className ?? ""}`}
                              title={`${f.label}: ${opt?.label ?? agg}`}
                            >
                              {f.short} {opt?.label ?? agg}
                            </span>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{r.assignee?.name ?? "—"}</TableCell>
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
        </div>
      </div>
    </div>
  );
}
