"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REQUEST_STATUS_LABELS, PRIORITY_LABELS, formatCurrency } from "@/lib/utils";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

export default function NewRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [comment, setComment] = useState("");

  const { register, handleSubmit, setValue, watch, control, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: "",
      description: "",
      status: "NEW",
      priority: "MEDIUM",
      clientId: clientId ?? "",
      assigneeId: "",
      items: [] as any[],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()).catch(() => []),
      fetch("/api/catalog").then((r) => r.json()),
    ]).then(([c, u, cat]) => {
      setClients(c);
      setUsers(u);
      setCatalog(cat);
    });
  }, []);

  const items = watch("items");
  const status = watch("status");
  const priority = watch("priority");
  const selectedClient = watch("clientId");

  const subtotal = items.reduce((sum: number, item: any) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const disc = parseFloat(item.discount) || 0;
    return sum + qty * price * (1 - disc / 100);
  }, 0);

  const calcTotal = (index: number) => {
    const item = items[index];
    const qty = parseFloat(item?.quantity) || 0;
    const price = parseFloat(item?.price) || 0;
    const disc = parseFloat(item?.discount) || 0;
    return qty * price * (1 - disc / 100);
  };

  const handleCatalogSelect = (index: number, serviceId: string) => {
    const svc = catalog.find((c) => c.id === serviceId);
    if (!svc) return;
    setValue(`items.${index}.name`, svc.name);
    setValue(`items.${index}.unit`, svc.unit || "шт");
    setValue(`items.${index}.price`, svc.price || 0);
  };

  const addRow = () => {
    append({ name: "", quantity: 1, unit: "шт", price: 0, discount: 0, total: 0 });
  };

  async function onSubmit(data: any) {
    const itemsWithTotal = data.items.map((item: any, i: number) => ({
      ...item,
      total: calcTotal(i),
    }));
    const amount = itemsWithTotal.reduce((s: number, it: any) => s + it.total, 0);

    const body = {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      clientId: data.clientId || null,
      assigneeId: data.assigneeId || null,
      amount: amount || null,
      items: itemsWithTotal,
    };

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      alert("Ошибка при создании заявки. Попробуйте ещё раз.");
      return;
    }

    const created = await res.json();

    if (comment.trim()) {
      await fetch(`/api/requests/${created.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: comment }),
      });
    }

    router.push(`/requests/${created.id}`);
  }

  return (
    <div>
      <Header title="Новая заявка" />
      <div className="p-6">
        <div className="mb-4">
          <Link href="/requests">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Назад
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Основная информация</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Название заявки *</Label>
                  <Input {...register("title", { required: true })} placeholder="Лазерная резка листового металла" />
                </div>
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea {...register("description")} rows={3} placeholder="Подробное описание работ..." />
                </div>
                <div className="space-y-2">
                  <Label>Контрагент *</Label>
                  <Select value={selectedClient} onValueChange={(v) => setValue("clientId", v)}>
                    <SelectTrigger><SelectValue placeholder="Выберите контрагента" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Позиции */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Позиции</CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={addRow}>
                  <Plus className="mr-1 h-4 w-4" /> Добавить позицию
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {fields.length === 0 ? (
                  <div className="px-6 pb-6 text-center">
                    <p className="text-sm text-slate-400 mb-3">Нет позиций</p>
                    <Button type="button" variant="outline" size="sm" onClick={addRow}>
                      <Plus className="mr-1 h-4 w-4" /> Добавить позицию
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 w-[35%]">Наименование</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-16">Кол-во</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-16">Ед.</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-24">Цена, ₽</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-16">Скидка %</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-24">Сумма, ₽</th>
                            <th className="px-2 py-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fields.map((field, index) => (
                            <tr key={field.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2">
                                <div className="space-y-1">
                                  <Input
                                    {...register(`items.${index}.name`)}
                                    placeholder="Наименование"
                                    className="h-8 text-sm"
                                    list={`catalog-list-${index}`}
                                  />
                                  <datalist id={`catalog-list-${index}`}>
                                    {catalog.map((s) => (
                                      <option key={s.id} value={s.name} />
                                    ))}
                                  </datalist>
                                </div>
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  {...register(`items.${index}.quantity`)}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="h-8 text-sm text-center w-full"
                                  placeholder="1"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  {...register(`items.${index}.unit`)}
                                  className="h-8 text-sm text-center w-full"
                                  placeholder="шт"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  {...register(`items.${index}.price`)}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="h-8 text-sm text-right w-full"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  {...register(`items.${index}.discount`)}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  className="h-8 text-sm text-center w-full"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-2 py-2 text-right text-sm font-medium text-slate-700 whitespace-nowrap">
                                {formatCurrency(calcTotal(index))}
                              </td>
                              <td className="px-2 py-2">
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Строка добавления */}
                    <div className="border-t border-slate-100 px-4 py-2">
                      <button
                        type="button"
                        onClick={addRow}
                        className="flex items-center gap-2 w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Добавить позицию</span>
                      </button>
                    </div>

                    {/* Инлайн комментарий */}
                    <div className="border-t border-slate-100 px-4 py-3">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Комментарий"
                        rows={3}
                        className="w-full resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-300 outline-none"
                      />
                    </div>

                    {/* Итог */}
                    <div className="border-t border-slate-100 px-6 py-3 flex justify-end">
                      <div className="text-sm space-y-1 text-right">
                        <div className="flex gap-8 text-slate-500">
                          <span>Позиций: {fields.length}</span>
                          <span>Итого:</span>
                          <span className="font-semibold text-slate-800 min-w-20">{formatCurrency(subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Параметры</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={status} onValueChange={(v) => setValue("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select value={priority} onValueChange={(v) => setValue("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ответственный</Label>
                  <Select value={watch("assigneeId")} onValueChange={(v) => setValue("assigneeId", v)}>
                    <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {fields.length > 0 && (
                  <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                    <p className="text-xs text-slate-500">Сумма по позициям</p>
                    <p className="text-lg font-semibold text-slate-800">{formatCurrency(subtotal)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать заявку
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
