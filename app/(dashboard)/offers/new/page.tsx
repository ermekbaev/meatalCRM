"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OFFER_STATUS_LABELS } from "@/lib/utils";
import { ArrowLeft, Plus, Trash2, Loader2, Building2, ClipboardCheck, X, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { CatalogPickerDialog } from "@/components/CatalogPickerDialog";

export default function NewOfferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");

  const [requests, setRequests] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [importedRequest, setImportedRequest] = useState<{ number: number; title: string } | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Прямой поиск контрагента
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, watch, control, formState: { isSubmitting } } = useForm({
    defaultValues: {
      requestId: requestId ?? "",
      numberOverride: "",
      status: "DRAFT",
      discount: 0,
      notes: "",
      validUntil: "",
      items: [{ service: "", description: "", quantity: 1, unit: "шт", price: 0, total: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const addFromCatalog = (item: any) => {
    append({
      service: item.name,
      description: item.description ?? "",
      quantity: 1,
      unit: item.unit ?? "шт",
      price: item.price ?? 0,
      total: item.price ?? 0,
    });
  };

  const [allClients, setAllClients] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/requests?minimal=true").then((r) => r.json()),
      fetch("/api/catalog").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([reqs, cat, cls]) => {
      setRequests(reqs);
      setCatalog(cat);
      const list = Array.isArray(cls) ? cls : cls.clients ?? [];
      setAllClients(list);
      setClientResults(list);
    });
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

  const items = watch("items");
  const discount = watch("discount");
  const selectedRequest = watch("requestId");
  const selectedStatus = watch("status");

  // При выборе заявки — подтягиваем контрагента и позиции
  useEffect(() => {
    if (!selectedRequest) {
      // Не сбрасываем clientInfo если выбран прямой контрагент
      if (!selectedClientId) setClientInfo(null);
      return;
    }
    fetch(`/api/requests/${selectedRequest}`)
      .then((r) => r.json())
      .then((req) => {
        setClientInfo(req.client ?? null);
        if (req.client) {
          setSelectedClientId(null); // сбрасываем прямой выбор, используем клиента из заявки
          setClientQuery("");
        }
        // Всегда импортируем позиции при выборе заявки
        if (req.items?.length > 0) {
          setValue("items", req.items.map((item: any) => ({
            service: item.name,
            description: "",
            quantity: item.quantity ?? 1,
            unit: item.unit ?? "шт",
            price: item.price ?? 0,
            total: item.total ?? 0,
          })));
          setImportedRequest({ number: req.number, title: req.title });
        }
      })
      .catch(() => setClientInfo(null));
  }, [selectedRequest]);

  const selectClient = (client: any) => {
    setSelectedClientId(client.id);
    setClientInfo(client);
    setClientQuery(client.name);
    setClientResults([]);
    setShowClientDropdown(false);
    // Сбрасываем привязку к заявке при прямом выборе контрагента
    setValue("requestId", "");
    setImportedRequest(null);
  };

  const clearClient = () => {
    setSelectedClientId(null);
    setClientInfo(null);
    setClientQuery("");
  };

  const subtotal = items.reduce((sum: number, item: any) => {
    return sum + (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.price)) || 0);
  }, 0);
  const total = subtotal * (1 - (parseFloat(String(discount)) || 0) / 100);

  const updateItemTotal = (index: number) => {
    const item = items[index];
    const t = (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.price)) || 0);
    setValue(`items.${index}.total`, t);
  };

  async function onSubmit(data: any) {
    const body = {
      ...data,
      numberOverride: data.numberOverride?.trim() || null,
      discount: parseFloat(String(data.discount)) || 0,
      total,
      requestId: data.requestId || null,
      clientId: selectedClientId || null,
      validUntil: data.validUntil || null,
      items: data.items.map((item: any) => ({
        ...item,
        quantity: parseFloat(String(item.quantity)) || 1,
        price: parseFloat(String(item.price)) || 0,
        total: (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.price)) || 0),
      })),
    };
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { alert("Ошибка при создании КП."); return; }
    const created = await res.json();
    router.push(`/offers/${created.id}`);
  }

  return (
    <div>
      <Header title="Новое КП" />
      <div className="p-6">
        <div className="mb-4">
          <Link href="/offers">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
          </Link>
        </div>

        {importedRequest && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Позиции импортированы из заявки #{importedRequest.number}</p>
                <p className="text-xs text-green-600">{importedRequest.title} · {fields.length} поз.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setValue("items", [{ service: "", description: "", quantity: 1, unit: "шт", price: 0, total: 0 }]);
                setImportedRequest(null);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Начать с чистого листа
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Перечень услуг</CardTitle>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setCatalogOpen(true)}>
                    <BookOpen className="mr-1 h-4 w-4" /> Из каталога
                  </Button>
                  <Button type="button" size="sm" variant="outline"
                    onClick={() => append({ service: "", description: "", quantity: 1, unit: "шт", price: 0, total: 0 })}>
                    <Plus className="mr-1 h-4 w-4" /> Вручную
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Услуга</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead className="w-24">Кол-во</TableHead>
                      <TableHead className="w-20">Ед.</TableHead>
                      <TableHead className="w-28">Цена</TableHead>
                      <TableHead className="w-28">Сумма</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Input
                            {...register(`items.${index}.service`)}
                            placeholder="Название услуги"
                            list="catalog-list"
                            onChange={(e) => {
                              setValue(`items.${index}.service`, e.target.value);
                              const cat = catalog.find((c: any) => c.name === e.target.value);
                              if (cat) {
                                setValue(`items.${index}.price`, cat.price ?? 0);
                                setValue(`items.${index}.unit`, cat.unit);
                                updateItemTotal(index);
                              }
                            }}
                          />
                          <datalist id="catalog-list">
                            {catalog.map((c: any) => <option key={c.id} value={c.name} />)}
                          </datalist>
                        </TableCell>
                        <TableCell>
                          <Input {...register(`items.${index}.description`)} placeholder="Доп. описание" />
                        </TableCell>
                        <TableCell>
                          <Input {...register(`items.${index}.quantity`)} type="number" min="0" step="0.01"
                            onChange={(e) => { setValue(`items.${index}.quantity`, parseFloat(e.target.value) || 0); updateItemTotal(index); }} />
                        </TableCell>
                        <TableCell>
                          <Input {...register(`items.${index}.unit`)} placeholder="шт" />
                        </TableCell>
                        <TableCell>
                          <Input {...register(`items.${index}.price`)} type="number" min="0" step="0.01"
                            onChange={(e) => { setValue(`items.${index}.price`, parseFloat(e.target.value) || 0); updateItemTotal(index); }} />
                        </TableCell>
                        <TableCell className="font-medium text-gray-700">
                          {((parseFloat(String(items[index]?.quantity)) || 0) * (parseFloat(String(items[index]?.price)) || 0)).toLocaleString("ru")} ₽
                        </TableCell>
                        <TableCell>
                          <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end p-4 border-t border-gray-100">
                  <div className="text-right space-y-1">
                    <p className="text-sm text-gray-500">Подытог: {subtotal.toLocaleString("ru")} ₽</p>
                    {parseFloat(String(discount)) > 0 && (
                      <p className="text-sm text-green-600">Скидка {discount}%: −{(subtotal - total).toLocaleString("ru")} ₽</p>
                    )}
                    <p className="text-lg font-bold text-gray-900">Итого: {total.toLocaleString("ru")} ₽</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Примечания</CardTitle></CardHeader>
              <CardContent>
                <Textarea {...register("notes")} rows={3} placeholder="Условия оплаты, сроки, гарантии..." />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Параметры КП</CardTitle></CardHeader>
              <CardContent className="space-y-4">

                {/* Прямой выбор контрагента */}
                <div className="space-y-2">
                  <Label>Контрагент</Label>
                  <div className="relative" ref={clientRef}>
                    {selectedClientId ? (
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
                                  <p className="truncate text-sm text-slate-800">{c.name}</p>
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

                {/* Заявка (опционально) */}
                <div className="space-y-2">
                  <Label>Заявка <span className="text-slate-400 font-normal">(необязательно)</span></Label>
                  <Select value={selectedRequest} onValueChange={(v) => setValue("requestId", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Не привязано" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не привязано</SelectItem>
                      {requests.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>#{r.number} {r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Карточка контрагента */}
                {clientInfo && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                      <Building2 className="h-3 w-3" /> Контрагент
                    </div>
                    <p className="text-sm font-medium text-slate-800">{clientInfo.name}</p>
                    {clientInfo.inn && (
                      <p className="text-xs text-slate-500">ИНН: <span className="font-mono text-slate-700">{clientInfo.inn}</span></p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Номер КП <span className="text-slate-400 font-normal">(необязательно)</span></Label>
                  <Input {...register("numberOverride")} placeholder="Авто" />
                </div>

                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={selectedStatus} onValueChange={(v) => setValue("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OFFER_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Скидка (%)</Label>
                  <Input {...register("discount")} type="number" min="0" max="100" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label>Действует до</Label>
                  <Input {...register("validUntil")} type="date" />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать КП
            </Button>
          </div>
        </form>
      </div>

      <CatalogPickerDialog open={catalogOpen} onClose={() => setCatalogOpen(false)} onSelect={addFromCatalog} />
    </div>
  );
}
