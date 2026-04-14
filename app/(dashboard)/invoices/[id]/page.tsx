"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Loader2, Trash2, Plus, Pencil, Check, X, Clipboard, ClipboardCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

function fmt(n: number) {
  return n.toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchInvoice = useCallback(async () => {
    const [invRes, compRes] = await Promise.all([
      fetch(`/api/invoices/${params.id}`),
      fetch("/api/settings/company"),
    ]);
    const [inv, comp] = await Promise.all([invRes.json(), compRes.json()]);
    setInvoice(inv);
    setItems(inv.items ?? []);
    setCompany(comp);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const { generateInvoicePDF } = await import("@/lib/invoice-pdf");
      await generateInvoicePDF(invoice, company);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleCopyText = () => {
    if (!invoice) return;
    const num = invoice.numberOverride ?? invoice.number;
    const date = new Date(invoice.date ?? invoice.createdAt).toLocaleDateString("ru");
    const clientName = invoice.client ? (invoice.client.shortName || invoice.client.name) : null;
    const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.total) || 0), 0);
    const vatAmount = invoice.vatRate > 0 ? subtotal * (invoice.vatRate / 100) : 0;
    const total = subtotal + vatAmount;

    const lines: string[] = [];
    lines.push(`Счёт №${num} от ${date}`);
    if (clientName) lines.push(`Клиент: ${clientName}`);
    lines.push("");
    items.forEach((item: any) => {
      lines.push(`${item.name}  ${item.quantity} ${item.unit}  Цена: ${Number(item.price).toLocaleString("ru")}  Сумма: ${Number(item.total).toLocaleString("ru")}`);
    });
    lines.push("");
    if (invoice.vatRate > 0) lines.push(`НДС ${invoice.vatRate}%: ${vatAmount.toLocaleString("ru")} руб.`);
    lines.push(`Итого: ${total.toLocaleString("ru")} руб.`);

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = async () => {
    await fetch(`/api/invoices/${params.id}`, { method: "DELETE" });
    router.push("/invoices");
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "quantity" || field === "price") {
        const q = parseFloat(field === "quantity" ? value : next[idx].quantity) || 0;
        const p = parseFloat(field === "price" ? value : next[idx].price) || 0;
        next[idx].total = q * p;
      }
      return next;
    });
  };

  const saveItems = async () => {
    setSaving(true);
    const res = await fetch(`/api/invoices/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...invoice, items }),
    });
    const updated = await res.json();
    setInvoice(updated);
    setItems(updated.items ?? []);
    setEditing(false);
    setSaving(false);
  };

  if (loading) return (
    <div>
      <Header title="Счёт" />
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    </div>
  );

  if (!invoice) return null;

  const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.total) || 0), 0);
  const vatAmount = invoice.vatRate > 0 ? subtotal * (invoice.vatRate / 100) : 0;
  const totalWithVat = subtotal + vatAmount;
  const client = invoice.client;

  return (
    <div>
      <Header title={`Счёт № ${invoice.numberOverride ?? invoice.number}`} />
      <div className="p-6 max-w-4xl space-y-5">
        {/* Тулбар */}
        <div className="flex items-center justify-between">
          <Link href="/invoices">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCopyText}>
              {copied ? <ClipboardCheck className="mr-2 h-4 w-4 text-green-500" /> : <Clipboard className="mr-2 h-4 w-4" />}
              {copied ? "Скопировано!" : "Скопировать текст"}
            </Button>
            <Button onClick={handleExportPDF} disabled={exportingPDF} variant="outline">
              {exportingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Скачать PDF
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить счёт?</AlertDialogTitle>
                  <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Реквизиты */}
        <Card>
          <CardHeader><CardTitle className="text-base">Счёт на оплату № {invoice.numberOverride ?? invoice.number} от {formatDate(invoice.date)}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Поставщик (Исполнитель)</p>
              <p className="font-medium text-gray-800">{company?.name}</p>
              {company?.inn && <p className="text-gray-500 text-xs">ИНН {company.inn}{company?.kpp ? ` / КПП ${company.kpp}` : ""}</p>}
              {company?.legalAddress && <p className="text-gray-500 text-xs">{company.legalAddress}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Покупатель (Заказчик)</p>
              <p className="font-medium text-gray-800">
                <Link href={`/clients/${client?.id}`} className="hover:underline text-blue-600">{client?.name}</Link>
              </p>
              {client?.inn && <p className="text-gray-500 text-xs">ИНН {client.inn}{client?.kpp ? ` / КПП ${client.kpp}` : ""}</p>}
              {(client?.legalAddress || client?.postalAddress) && (
                <p className="text-gray-500 text-xs">{client?.legalAddress ?? client?.postalAddress}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Основание</p>
              <p className="font-medium">{invoice.basis ?? "Основной договор"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Срок оплаты</p>
              <p className="font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : "—"}</p>
            </div>
            {invoice.request && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Заявка</p>
                <Link href={`/requests/${invoice.request.id}`} className="text-blue-600 hover:underline font-medium text-sm">
                  #{invoice.request.number} {invoice.request.title}
                </Link>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-0.5">НДС</p>
              <p className="font-medium">{invoice.vatRate > 0 ? `${invoice.vatRate}%` : "Без НДС"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Позиции */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Позиции</CardTitle>
              {!editing ? (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Редактировать
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setItems(invoice.items); setEditing(false); }}>
                    <X className="mr-1.5 h-3.5 w-3.5" /> Отмена
                  </Button>
                  <Button size="sm" onClick={saveItems} disabled={saving}>
                    {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                    Сохранить
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="pb-2 text-left font-medium w-8">№</th>
                  <th className="pb-2 text-left font-medium">Наименование</th>
                  <th className="pb-2 text-center font-medium w-20">Кол-во</th>
                  <th className="pb-2 text-center font-medium w-16">Ед.</th>
                  <th className="pb-2 text-right font-medium w-24">Цена, ₽</th>
                  <th className="pb-2 text-right font-medium w-24">Сумма, ₽</th>
                  {editing && <th className="pb-2 w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 pr-2 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="py-2 pr-2">
                      {editing
                        ? <Input value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} className="h-7 text-sm" />
                        : <span className="font-medium text-gray-800">{item.name}</span>}
                    </td>
                    <td className="py-2 px-1 text-center">
                      {editing
                        ? <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="h-7 text-sm text-center w-20" />
                        : item.quantity}
                    </td>
                    <td className="py-2 px-1 text-center text-gray-500">
                      {editing
                        ? <Input value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} className="h-7 text-sm text-center w-16" />
                        : item.unit}
                    </td>
                    <td className="py-2 px-1 text-right">
                      {editing
                        ? <Input type="number" value={item.price} onChange={(e) => updateItem(idx, "price", e.target.value)} className="h-7 text-sm text-right w-24" />
                        : fmt(item.price)}
                    </td>
                    <td className="py-2 pl-2 text-right font-medium tabular-nums">{fmt(parseFloat(item.total) || 0)}</td>
                    {editing && (
                      <td className="py-2 pl-1">
                        {items.length > 1 && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400"
                            onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {editing && (
              <Button size="sm" variant="ghost" className="mt-2 text-gray-500"
                onClick={() => setItems((p) => [...p, { name: "", quantity: 1, unit: "шт", price: "", total: 0 }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Добавить позицию
              </Button>
            )}

            {/* Итоги */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{invoice.vatRate > 0 ? "Без НДС:" : "Итого:"}</span>
                  <span className="font-medium tabular-nums">{fmt(subtotal)} ₽</span>
                </div>
                {invoice.vatRate > 0 && (
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>НДС {invoice.vatRate}%:</span>
                    <span className="tabular-nums">+{fmt(vatAmount)} ₽</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                  <span>Всего к оплате:</span>
                  <span className="tabular-nums">{fmt(totalWithVat)} ₽</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {invoice.notes && (
          <Card>
            <CardHeader><CardTitle className="text-base">Примечания</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p></CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
