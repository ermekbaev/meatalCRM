"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OFFER_STATUS_LABELS, OFFER_STATUS_COLORS, formatDate, formatCurrency } from "@/lib/utils";
import { ArrowLeft, FileDown, Loader2, Building2 } from "lucide-react";
import Link from "next/link";

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/offers/${params.id}`)
      .then((r) => r.json())
      .then((data) => { setOffer(data); setLoading(false); });
  }, [params.id]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    const res = await fetch(`/api/offers/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...offer, status, items: offer.items }),
    });
    const updated = await res.json();
    setOffer(updated);
    setSaving(false);
  };

  const [exportingPDF, setExportingPDF] = useState(false);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings/company").then((r) => r.json()).then(setCompany).catch(() => {});
  }, []);

  const handleExportPDF = async () => {
    if (!offer) return;
    setExportingPDF(true);
    const { generateOfferPDF } = await import("@/lib/pdf");
    await generateOfferPDF(offer, company);
    setExportingPDF(false);
  };

  if (loading) {
    return (
      <div>
        <Header title="КП" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!offer) return null;

  const subtotal = offer.items.reduce((s: number, i: any) => s + i.total, 0);

  return (
    <div>
      <Header title={`КП ${offer.numberOverride ?? `#${offer.number}`}`} />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/offers">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF} disabled={exportingPDF}>
              {exportingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Скачать PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Main */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header block */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Коммерческое предложение {offer.numberOverride ?? `#${offer.number}`}</h2>
                    {offer.request && (
                      <p className="mt-1 text-sm text-gray-500">
                        Заявка: <Link href={`/requests/${offer.request.id}`} className="text-blue-600 hover:underline">#{offer.request.number} {offer.request.title}</Link>
                      </p>
                    )}
                    {offer.request?.client && (
                      <p className="text-sm text-gray-500">
                        Клиент: <Link href={`/clients/${offer.request.client.id}`} className="text-blue-600 hover:underline">{offer.request.client.name}</Link>
                      </p>
                    )}
                    <p className="mt-2 text-sm text-gray-400">Создано: {formatDate(offer.createdAt)} · {offer.createdBy?.name}</p>
                    {offer.validUntil && (
                      <p className="text-sm text-gray-400">Действует до: {formatDate(offer.validUntil)}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${OFFER_STATUS_COLORS[offer.status]}`}>
                    {OFFER_STATUS_LABELS[offer.status]}
                  </span>
                </div>

                {/* Реквизиты контрагента */}
                {offer.request?.client && (offer.request.client.inn || offer.request.client.kpp || offer.request.client.legalAddress) && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <Building2 className="h-3.5 w-3.5" />
                      Реквизиты контрагента
                    </div>
                    <p className="text-sm font-medium text-slate-800">{offer.request.client.name}</p>
                    {(offer.request.client.inn || offer.request.client.kpp) && (
                      <div className="flex gap-6 text-xs text-slate-500">
                        {offer.request.client.inn && <span>ИНН: <span className="font-mono text-slate-700">{offer.request.client.inn}</span></span>}
                        {offer.request.client.kpp && <span>КПП: <span className="font-mono text-slate-700">{offer.request.client.kpp}</span></span>}
                      </div>
                    )}
                    {offer.request.client.legalAddress && (
                      <p className="text-xs text-slate-500">Юр. адрес: <span className="text-slate-700">{offer.request.client.legalAddress}</span></p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader><CardTitle className="text-base">Перечень услуг</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-8">№</TableHead>
                      <TableHead>Услуга</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead className="w-24 text-right">Кол-во</TableHead>
                      <TableHead className="w-16 text-right">Ед.</TableHead>
                      <TableHead className="w-28 text-right">Цена</TableHead>
                      <TableHead className="w-28 text-right">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offer.items.map((item: any, idx: number) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-gray-400">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-gray-900">{item.service}</TableCell>
                        <TableCell className="text-gray-500">{item.description ?? "—"}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right text-gray-500">{item.unit}</TableCell>
                        <TableCell className="text-right">{item.price.toLocaleString("ru")} ₽</TableCell>
                        <TableCell className="text-right font-medium">{item.total.toLocaleString("ru")} ₽</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="border-t border-gray-100 p-6">
                  <div className="ml-auto w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Подытог</span>
                      <span>{subtotal.toLocaleString("ru")} ₽</span>
                    </div>
                    {offer.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Скидка {offer.discount}%</span>
                        <span>−{(subtotal - offer.total).toLocaleString("ru")} ₽</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
                      <span>Итого</span>
                      <span>{offer.total.toLocaleString("ru")} ₽</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {offer.notes && (
              <Card>
                <CardHeader><CardTitle className="text-base">Примечания</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{offer.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <Card>
              <CardHeader><CardTitle className="text-base">Управление</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Статус</p>
                  <Select value={offer.status} onValueChange={updateStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OFFER_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {saving && <p className="text-xs text-gray-400">Сохранение...</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
