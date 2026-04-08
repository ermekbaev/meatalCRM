"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Loader2, FileText, Building2, Search, X } from "lucide-react";
import Link from "next/link";

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");

  const [allClients, setAllClients] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  const [numberOverride, setNumberOverride] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState(requestId ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [basis, setBasis] = useState("Основной договор");
  const [vatRate, setVatRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([{ name: "", quantity: 1, unit: "шт", price: "", total: 0 }]);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((cls) => {
      const list = Array.isArray(cls) ? cls : cls.clients ?? [];
      setAllClients(list);
      setClientResults(list);
    }).catch(() => {});
    fetch("/api/requests?limit=200").then((r) => r.json()).then((d) => setRequests(Array.isArray(d) ? d : d.data ?? [])).catch(() => {});
  }, []);

  // Поиск контрагентов
  useEffect(() => {
    if (!clientQuery.trim()) {
      setClientResults(allClients);
      return;
    }
    const q = clientQuery.toLowerCase();
    setClientResults(allClients.filter((c) =>
      c.name.toLowerCase().includes(q) || c.inn?.includes(q)
    ));
  }, [clientQuery, allClients]);

  // Закрытие дропдауна при клике вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Синхронизация имени контрагента при автозаполнении из заявки
  useEffect(() => {
    if (clientId && allClients.length > 0) {
      const client = allClients.find((c) => c.id === clientId);
      if (client && clientQuery !== (client.shortName || client.name)) setClientQuery(client.shortName || client.name);
    }
  }, [clientId, allClients]);

  // Автозаполнение из заявки
  useEffect(() => {
    if (!selectedRequestId) return;
    fetch(`/api/requests/${selectedRequestId}`)
      .then((r) => r.json())
      .then((req) => {
        if (req.clientId) setClientId(req.clientId);
        if (req.items?.length) {
          setItems(req.items.map((it: any) => ({
            name: it.name,
            quantity: it.quantity,
            unit: it.unit,
            price: it.price,
            total: it.total,
          })));
        }
      })
      .catch(() => {});
  }, [selectedRequestId]);

  const selectClient = (client: any) => {
    setClientId(client.id);
    setClientQuery(client.shortName || client.name);
    setShowClientDropdown(false);
    setSelectedRequestId(""); // сбрасываем заявку при смене контрагента
  };

  const clearClient = () => {
    setClientId("");
    setClientQuery("");
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

  const addItem = () => setItems((p) => [...p, { name: "", quantity: 1, unit: "шт", price: "", total: 0 }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const vat = parseFloat(vatRate) > 0 ? subtotal * (parseFloat(vatRate) / 100) : 0;
  const totalWithVat = subtotal + vat;

  const handleSave = async () => {
    if (!clientId) return alert("Выберите контрагента");
    if (items.some((i) => !i.name.trim())) return alert("Заполните названия всех позиций");

    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        numberOverride: numberOverride.trim() || null,
        requestId: selectedRequestId || null,
        date,
        dueDate: dueDate || null,
        basis,
        vatRate: parseFloat(vatRate) || 0,
        notes: notes || null,
        items: items.map((i) => ({
          ...i,
          quantity: parseFloat(i.quantity) || 1,
          price: parseFloat(i.price) || 0,
          total: parseFloat(i.total) || 0,
        })),
      }),
    });

    if (res.ok) {
      const inv = await res.json();
      router.push(`/invoices/${inv.id}`);
    } else {
      setSaving(false);
      alert("Ошибка при сохранении");
    }
  };

  return (
    <div>
      <Header title="Новый счёт" />
      <div className="p-6 space-y-5 max-w-4xl">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
          </Link>
        </div>

        {/* Основные параметры */}
        <Card>
          <CardHeader><CardTitle className="text-base">Параметры счёта</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Контрагент (покупатель) *</Label>
              <div className="relative" ref={clientRef}>
                {clientId ? (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm font-medium text-slate-800 truncate">{clientQuery}</span>
                    <button type="button" onClick={clearClient} className="text-slate-400 hover:text-slate-600 ml-2 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        value={clientQuery}
                        onChange={(e) => { setClientQuery(e.target.value); setShowClientDropdown(true); }}
                        onFocus={() => setShowClientDropdown(true)}
                        placeholder="Поиск контрагента..."
                        className="pl-8 text-sm"
                      />
                    </div>
                    {showClientDropdown && clientResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                        {clientResults.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left"
                            onMouseDown={() => selectClient(c)}
                          >
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <div className="min-w-0">
                              <p className="truncate text-sm text-slate-800">{c.shortName || c.name}</p>
                              {c.inn && <p className="text-[11px] text-slate-400">ИНН {c.inn}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Номер счёта <span className="text-gray-400 font-normal">(необязательно)</span></Label>
              <Input value={numberOverride} onChange={(e) => setNumberOverride(e.target.value)} placeholder="Авто" />
            </div>

            <div className="space-y-2">
              <Label>Связанная заявка</Label>
              <Select value={selectedRequestId || "__none__"} onValueChange={(v) => setSelectedRequestId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Без заявки" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Без заявки</SelectItem>
                  {(clientId ? requests.filter((r) => r.client?.id === clientId) : requests).map((r) => (
                    <SelectItem key={r.id} value={r.id}>#{r.number} {r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Основание</Label>
              <Input value={basis} onChange={(e) => setBasis(e.target.value)} placeholder="Основной договор" />
            </div>

            <div className="space-y-2">
              <Label>Дата счёта</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Оплатить до</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>НДС</Label>
              <Select value={vatRate} onValueChange={setVatRate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Без НДС</SelectItem>
                  <SelectItem value="22">НДС 22%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Примечания</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Дополнительная информация..." />
            </div>
          </CardContent>
        </Card>

        {/* Позиции */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Позиции</CardTitle>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Добавить
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="pb-2 text-left font-medium w-8">№</th>
                    <th className="pb-2 text-left font-medium">Наименование</th>
                    <th className="pb-2 text-center font-medium w-20">Кол-во</th>
                    <th className="pb-2 text-center font-medium w-16">Ед.</th>
                    <th className="pb-2 text-right font-medium w-24">Цена, ₽</th>
                    <th className="pb-2 text-right font-medium w-24">Сумма, ₽</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-2 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-2 pr-2">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                          placeholder="Наименование"
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          type="number" min="0" step="0.001"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                          className="h-8 text-sm text-center"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(idx, "unit", e.target.value)}
                          className="h-8 text-sm text-center"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input
                          type="number" min="0" step="0.01"
                          value={item.price}
                          onChange={(e) => updateItem(idx, "price", e.target.value)}
                          className="h-8 text-sm text-right"
                        />
                      </td>
                      <td className="py-2 pl-1 text-right font-medium text-gray-700 tabular-nums">
                        {(parseFloat(item.total) || 0).toLocaleString("ru", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 pl-1">
                        {items.length > 1 && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Итоги */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{parseFloat(vatRate) > 0 ? "Без НДС:" : "Итого:"}</span>
                  <span className="font-medium">{subtotal.toLocaleString("ru", { minimumFractionDigits: 2 })} ₽</span>
                </div>
                {parseFloat(vatRate) > 0 && (
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>НДС {vatRate}%:</span>
                    <span>+{vat.toLocaleString("ru", { minimumFractionDigits: 2 })} ₽</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                  <span>К оплате:</span>
                  <span>{totalWithVat.toLocaleString("ru", { minimumFractionDigits: 2 })} ₽</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/invoices"><Button variant="outline">Отмена</Button></Link>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Создать счёт
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoiceForm />
    </Suspense>
  );
}
