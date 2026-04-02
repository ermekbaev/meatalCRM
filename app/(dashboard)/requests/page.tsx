"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Search, Trash2, Eye, Download } from "lucide-react";
import * as XLSX from "xlsx";

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "ALL") params.set("status", status);
    if (priority && priority !== "ALL") params.set("priority", priority);
    const res = await fetch(`/api/requests?${params}`);
    const data = await res.json();
    setRequests(data);
    setLoading(false);
  }, [search, status, priority]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/requests/${id}`, { method: "DELETE" });
    fetchRequests();
  };

  const handleExport = () => {
    const rows = requests.map((r) => ({
      "№": r.number,
      "Название": r.title,
      "Клиент": r.client?.name ?? "",
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
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
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
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Приоритет" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все приоритеты</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button onClick={() => router.push("/requests/new")}>
              <Plus className="mr-2 h-4 w-4" /> Создать
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-16">№</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Приоритет</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Ответственный</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-400">Загрузка...</TableCell></TableRow>
              ) : requests.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-400">Заявки не найдены</TableCell></TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-gray-500">#{r.number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{r.title}</p>
                        {r._count?.comments > 0 && (
                          <p className="text-xs text-gray-400">{r._count.comments} комм.</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{r.client?.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${REQUEST_STATUS_COLORS[r.status]}`}>
                          {REQUEST_STATUS_LABELS[r.status]}
                        </span>
                        {r.paymentStatus && r.paymentStatus !== "NONE" && (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_STATUS_COLORS[r.paymentStatus]}`}>
                            {PAYMENT_STATUS_LABELS[r.paymentStatus]}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_COLORS[r.priority]}`}>
                        {PRIORITY_LABELS[r.priority]}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{r.amount ? formatCurrency(r.amount) : "—"}</TableCell>
                    <TableCell className="text-gray-600">{r.assignee?.name ?? "—"}</TableCell>
                    <TableCell className="text-gray-500">{formatDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => router.push(`/requests/${r.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
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
