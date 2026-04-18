"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Plus, Trash2, Loader2, Building2, X, BookOpen, Search, FileDown } from "lucide-react";
import Link from "next/link";
import { CatalogPickerDialog } from "@/components/CatalogPickerDialog";

export default function EditOfferPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [requests, setRequests] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [vatRate, setVatRate] = useState(0);
  const [managerMode, setManagerMode] = useState<"user" | "custom">("user");
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [managerCustom, setManagerCustom] = useState("");
  const [company, setCompany] = useState<any>(null);
  const [previewingPDF, setPreviewingPDF] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [clientQuery, setClientQuery] = useState("");
  const [allClients, setAllClients] = useState<any[]>([]);
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, watch, control, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      requestId: "",
      numberOverride: "",
      status: "DRAFT",
      discount: 0,
      notes: "",
      validUntil: "",
      deliveryTerms: "",
      items: [{ service: "", description: "", quantity: 1, unit: "шт", price: 0, total: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Загрузка начальных данных
  useEffect(() => {
    Promise.all([
      fetch(`/api/offers/${id}`).then((r) => r.json()),
      fetch("/api/requests?minimal=true").then((r) => r.json()),
      fetch("/api/catalog").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/settings/company").then((r) => r.json()).catch(() => null),
    ]).then(([offer, reqs, cat, cls, usr, comp]) => {
      setRequests(reqs);
      setCatalog(cat);
      setCompany(comp);
      const list = Array.isArray(cls) ? cls : cls.clients ?? [];
      setAllClients(list);
      setClientResults(list);
      const userList = Array.isArray(usr) ? usr : usr.users ?? [];
      setUsers(userList);

      // Предзаполнение формы
      reset({
        requestId: offer.requestId ?? "",
        numberOverride: offer.numberOverride ?? "",
        status: offer.status ?? "DRAFT",
        discount: offer.discount ?? 0,
        notes: offer.notes ?? "",
        validUntil: offer.validUntil ? offer.validUntil.substring(0, 10) : "",
        deliveryTerms: offer.deliveryTerms ?? "",
        items: offer.items.map((item: any) => ({
          service: item.service,
          description: item.description ?? "",
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          total: item.total,
        })),
      });
      setVatRate(offer.vatRate ?? 0);

      // Клиент
      const client = offer.client || offer.request?.client;
      if (client) {
        setClientInfo(client);
        if (offer.clientId) {
          setSelectedClientId(offer.clientId);
          setClientQuery(client.shortName || client.name);
        }
      }

      // Менеджер
      if (offer.managerId) {
        setManagerMode("user");
        setSelectedManagerId(offer.managerId);
      } else if (offer.managerCustom) {
        setManagerMode("custom");
        setManagerCustom(offer.managerCustom);
      }

      setInitialLoading(false);
    });
  }, [id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!clientQuery.trim()) { setClientResults(allClients); return; }
    const q = clientQuery.toLowerCase();
    setClientResults(allClients.filter((c) => c.name.toLowerCase().includes(q) || c.inn?.includes(q)));
  }, [clientQuery, allClients]);

  const items = watch("items");
  const discount = watch("discount");
  const selectedRequest = watch("requestId");
  const selectedStatus = watch("status");

  const subtotal = items.reduce((sum: number, item: any) =>
    sum + (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.price)) || 0), 0);
  const afterDiscount = subtotal * (1 - (parseFloat(String(discount)) || 0) / 100);
  const vatAmount = afterDiscount * (vatRate / 100);
  const total = afterDiscount + vatAmount;

  const updateItemTotal = (index: number) => {
    const item = items[index];
    setValue(`items.${index}.total`, (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.price)) || 0));
  };

  const selectClient = (client: any) => {
    setSelectedClientId(client.id);
    setClientInfo(client);
    setClientQuery(client.shortName || client.name);
    setShowClientDropdown(false);
    setValue("requestId", "");
  };

  const clearClient = () => {
    setSelectedClientId(null);
    setClientInfo(null);
    setClientQuery("");
  };

  const addFromCatalog = (item: any) => {
    append({ service: item.name, description: item.description ?? "", quantity: 1, unit: item.unit ?? "шт", price: item.price ?? 0, total: item.price ?? 0 });
  };

  const handlePreviewPDF = async () => {
    setPreviewingPDF(true);
    const data = watch();
    const mockOffer = {
      number: 0,
      numberOverride: data.numberOverride || null,
      createdAt: new Date().toISOString(),
      validUntil: data.validUntil || null,
      discount: parseFloat(String(data.discount)) || 0,
      vatRate,
      total,
      notes: data.notes || null,
      deliveryTerms: data.deliveryTerms || null,
      client: clientInfo,
      request: null,
      createdBy: null,
      manager: users.find((u) => u.id === selectedManagerId) ?? null,
      managerCustom: managerMode === "custom" ? managerCustom : null,
      items: data.items.map((item: any) => ({
        ...item,
        quantity: parseFloat(String(item.quantity)) || 0,
        price: parseFloat(String(item.price)) || 0,
        total: (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.price)) || 0),
      })),
    };
    const { generateOfferPDF } = await import("@/lib/pdf");
    await generateOfferPDF(mockOffer, company);
    setPreviewingPDF(false);
  };

  async function onSubmit(data: any) {
    const body = {
      ...data,
      numberOverride: data.numberOverride?.trim() || null,
      discount: parseFloat(String(data.discount)) || 0,
      vatRate,
      total,
      requestId: data.requestId || null,
      clientId: selectedClientId || null,
      validUntil: data.validUntil || null,
      deliveryTerms: data.deliveryTerms?.trim() || null,
      managerId: managerMode === "user" ? (selectedManagerId || null) : null,
      managerCustom: managerMode === "custom" ? (managerCustom.trim() || null) : null,
      items: data.items.map((item: any) => ({
        ...item,
        quantity: parseFloat(String(item.quantity)) || 1,
        price: parseFloat(String(item.price)) || 0,
        total: (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.price)) || 0),
      })),
    };
    const res = await fetch(`/api/offers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { alert("Ошибка при сохранении КП."); return; }
    router.push(`/offers/${id}`);
  }

  if (initialLoading) {
    return (
      <div>
        <Header title="Редактирование КП" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Редактирование КП" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/offers/${id}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={handlePreviewPDF} disabled={previewingPDF}>
            {previewingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Предпросмотр PDF
          </Button>
        </div>

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
                      <p className="text-sm text-green-600">Скидка {discount}%: −{(subtotal - afterDiscount).toLocaleString("ru")} ₽</p>
                    )}
                    {vatRate > 0 && (
                      <p className="text-sm text-gray-500">НДС {vatRate}%: {vatAmount.toLocaleString("ru")} ₽</p>
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

                {/* Контрагент */}
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
                              <button key={c.id} type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left"
                                onMouseDown={() => selectClient(c)}>
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

                {/* Менеджер */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Менеджер</Label>
                    <button type="button" onClick={() => setManagerMode(managerMode === "user" ? "custom" : "user")}
                      className="text-xs text-blue-600 hover:underline">
                      {managerMode === "user" ? "Написать вручную" : "Выбрать из списка"}
                    </button>
                  </div>
                  {managerMode === "user" ? (
                    <Select value={selectedManagerId || "none"} onValueChange={(v) => setSelectedManagerId(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="По умолчанию (автор)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">По умолчанию (автор)</SelectItem>
                        {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={managerCustom} onChange={(e) => setManagerCustom(e.target.value)} placeholder="Имя менеджера..." />
                  )}
                </div>

                {/* Сроки */}
                <div className="space-y-2">
                  <Label>Сроки <span className="text-slate-400 font-normal">(необязательно)</span></Label>
                  <Input {...register("deliveryTerms")} placeholder="Например: 5-7 рабочих дней" />
                </div>

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

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-700">НДС</p>
                    <p className="text-xs text-gray-400">Добавить НДС к итогу</p>
                  </div>
                  <Select value={String(vatRate)} onValueChange={(v) => setVatRate(parseFloat(v))}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Без НДС</SelectItem>
                      <SelectItem value="20">НДС 20%</SelectItem>
                      <SelectItem value="22">НДС 22%</SelectItem>
                      <SelectItem value="10">НДС 10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Действует до</Label>
                  <Input {...register("validUntil")} type="date" />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить изменения
            </Button>
          </div>
        </form>
      </div>

      <CatalogPickerDialog open={catalogOpen} onClose={() => setCatalogOpen(false)} onSelect={addFromCatalog} />
    </div>
  );
}
