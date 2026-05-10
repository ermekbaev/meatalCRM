"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Download, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

function fmt(n: number) {
  return n.toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    fetch("/api/invoices").then((r) => r.json()).then(setInvoices).catch(() => {}).finally(() => setLoading(false));
    fetch("/api/settings/company").then((r) => r.json()).then(setCompany).catch(() => {});
  }, []);

  const filtered = invoices.filter((inv) =>
    inv.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    String(inv.numberOverride ?? inv.number).includes(search)
  );

  const handleExport = async (e: React.MouseEvent, inv: any) => {
    e.preventDefault();
    setExportingId(inv.id);
    try {
      const { generateInvoicePDF } = await import("@/lib/invoice-pdf");
      const fullInv = await fetch(`/api/invoices/${inv.id}`).then((r) => r.json());
      await generateInvoicePDF(fullInv, company);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div>
      <Header title="Счета" />
      <div className="p-4 lg:p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-full sm:flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по контрагенту или номеру..."
              className="pl-9"
            />
          </div>
          <Link href="/invoices/new" className="w-full sm:w-auto sm:ml-auto">
            <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Новый счёт</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 text-gray-400">
            <FileText className="h-10 w-10" />
            <p className="text-sm">{search ? "Ничего не найдено" : "Счётов ещё нет"}</p>
            {!search && (
              <Link href="/invoices/new">
                <Button size="sm" variant="outline">Создать первый счёт</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((inv) => {
              const total = inv.items?.reduce((s: number, i: any) => s + i.total, 0) ?? 0;
              const overdue = inv.dueDate && new Date(inv.dueDate) < new Date();
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="block rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-medium text-gray-900 text-sm truncate flex-1 min-w-0">{inv.client?.name}</p>
                    <span className="font-mono text-[11px] text-gray-400 shrink-0">#{inv.numberOverride ?? inv.number}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-500 min-w-0 flex-1">
                      <span>{formatDate(inv.date)}</span>
                      {inv.request && <><span className="mx-1.5">·</span><span>заявка #{inv.request.number}</span></>}
                      {inv.dueDate && <><span className="mx-1.5">·</span><span className={overdue ? "text-red-500 font-medium" : ""}>до {formatDate(inv.dueDate)}</span></>}
                    </div>
                    <span className="font-bold text-gray-800 tabular-nums shrink-0">{fmt(total)} ₽</span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={(e) => handleExport(e, inv)}
                      disabled={exportingId === inv.id}
                    >
                      {exportingId === inv.id
                        ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        : <Download className="mr-1.5 h-3.5 w-3.5" />}
                      PDF
                    </Button>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 w-16">№</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Контрагент</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Заявка</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Срок оплаты</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Сумма</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 w-24">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((inv) => {
                  const total = inv.items?.reduce((s: number, i: any) => s + i.total, 0) ?? 0;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="font-bold text-gray-800 hover:text-orange-600">
                          #{inv.numberOverride ?? inv.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="font-medium text-gray-800 hover:text-orange-600">
                          {inv.client?.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {inv.request
                          ? <Link href={`/requests/${inv.request.id}`} className="hover:underline">#{inv.request.number}</Link>
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {inv.dueDate
                          ? <span className={new Date(inv.dueDate) < new Date() ? "text-red-500 font-medium" : ""}>{formatDate(inv.dueDate)}</span>
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-800">
                        {fmt(total)} ₽
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-gray-500 hover:text-orange-600"
                          onClick={(e) => handleExport(e, inv)}
                          disabled={exportingId === inv.id}
                        >
                          {exportingId === inv.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Download className="h-3.5 w-3.5" />}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
