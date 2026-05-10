"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  OFFER_STATUS_LABELS,
  OFFER_STATUS_COLORS,
  formatDate,
  formatCurrency,
} from "@/lib/utils";
import { Plus, Search, Trash2, Eye, FileDown } from "lucide-react";

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "ALL") params.set("status", status);
    const res = await fetch(`/api/offers?${params}`);
    const data = await res.json();
    setOffers(data);
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/offers/${id}`, { method: "DELETE" });
    fetchOffers();
  };

  return (
    <div>
      <Header title="Коммерческие предложения" />
      <div className="p-4 lg:p-6 space-y-4">
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
              {Object.entries(OFFER_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full sm:w-auto sm:ml-auto"
            onClick={() => router.push("/offers/new")}
          >
            <Plus className="mr-2 h-4 w-4" /> Создать КП
          </Button>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">Загрузка...</div>
          ) : offers.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">КП не найдены</div>
          ) : offers.map((o) => (
            <div key={o.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {o.request?.title ?? "—"}
                  </p>
                  {o.request?.client && (
                    <p className="text-xs text-gray-500 truncate">
                      {o.request.client.shortName || o.request.client.name}
                    </p>
                  )}
                </div>
                <span className="font-mono text-[11px] text-gray-400 shrink-0">#{o.numberOverride ?? o.number}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${OFFER_STATUS_COLORS[o.status]}`}>
                  {OFFER_STATUS_LABELS[o.status]}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {o.items?.length ?? 0} поз.
                </span>
                {o.discount > 0 && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600">
                    −{o.discount}%
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500 min-w-0 flex-1">
                  <span className="font-medium text-gray-800">{formatCurrency(o.total)}</span>
                  <span className="mx-1.5">·</span>
                  <span>{formatDate(o.createdAt)}</span>
                  {o.validUntil && <><span className="mx-1.5">·</span><span>до {formatDate(o.validUntil)}</span></>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => router.push(`/offers/${o.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить КП?</AlertDialogTitle>
                        <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(o.id)}>Удалить</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                <TableHead>Заявка / Клиент</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Позиций</TableHead>
                <TableHead>Скидка</TableHead>
                <TableHead>Итого</TableHead>
                <TableHead>Действует до</TableHead>
                <TableHead>Создано</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-gray-400"
                  >
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : offers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-gray-400"
                  >
                    КП не найдены
                  </TableCell>
                </TableRow>
              ) : (
                offers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-gray-500">
                      #{o.numberOverride ?? o.number}
                    </TableCell>
                    <TableCell>
                      <div>
                        {o.request ? (
                          <p className="font-medium text-gray-900">
                            {o.request.title}
                          </p>
                        ) : (
                          <p className="text-gray-400">—</p>
                        )}
                        {o.request?.client && (
                          <p className="text-xs text-gray-500">
                            {o.request.client.shortName || o.request.client.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${OFFER_STATUS_COLORS[o.status]}`}
                      >
                        {OFFER_STATUS_LABELS[o.status]}
                      </span>
                    </TableCell>
                    <TableCell>{o.items?.length ?? 0}</TableCell>
                    <TableCell>
                      {o.discount > 0 ? `${o.discount}%` : "—"}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {formatCurrency(o.total)}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {o.validUntil ? formatDate(o.validUntil) : "—"}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(o.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => router.push(`/offers/${o.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить КП?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Это действие необратимо.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(o.id)}
                              >
                                Удалить
                              </AlertDialogAction>
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
