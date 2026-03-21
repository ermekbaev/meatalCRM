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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OFFER_STATUS_LABELS } from "@/lib/utils";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewOfferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");

  const [requests, setRequests] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);

  const { register, handleSubmit, setValue, watch, control, formState: { isSubmitting } } = useForm({
    defaultValues: {
      requestId: requestId ?? "",
      status: "DRAFT",
      discount: 0,
      notes: "",
      validUntil: "",
      items: [{ service: "", description: "", quantity: 1, unit: "шт", price: 0, total: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    Promise.all([
      fetch("/api/requests").then((r) => r.json()),
      fetch("/api/catalog").then((r) => r.json()),
    ]).then(([reqs, cat]) => {
      setRequests(reqs);
      setCatalog(cat);
    });
  }, []);

  const items = watch("items");
  const discount = watch("discount");

  const subtotal = items.reduce((sum: number, item: any) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
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
      discount: parseFloat(String(data.discount)) || 0,
      total,
      requestId: data.requestId || null,
      validUntil: data.validUntil || null,
      items: data.items.map((item: any) => ({
        ...item,
        quantity: parseFloat(item.quantity) || 1,
        price: parseFloat(item.price) || 0,
        total: (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
      })),
    };
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const created = await res.json();
    router.push(`/offers/${created.id}`);
  }

  const selectedStatus = watch("status");
  const selectedRequest = watch("requestId");

  return (
    <div>
      <Header title="Новое КП" />
      <div className="p-6">
        <div className="mb-4">
          <Link href="/offers">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Назад</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-6">
            {/* Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Перечень услуг</CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ service: "", description: "", quantity: 1, unit: "шт", price: 0, total: 0 })}
                >
                  <Plus className="mr-1 h-4 w-4" /> Добавить
                </Button>
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
                          <Input
                            {...register(`items.${index}.quantity`)}
                            type="number"
                            min="0"
                            step="0.01"
                            onChange={(e) => { setValue(`items.${index}.quantity`, parseFloat(e.target.value) || 0); updateItemTotal(index); }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input {...register(`items.${index}.unit`)} placeholder="шт" />
                        </TableCell>
                        <TableCell>
                          <Input
                            {...register(`items.${index}.price`)}
                            type="number"
                            min="0"
                            step="0.01"
                            onChange={(e) => { setValue(`items.${index}.price`, parseFloat(e.target.value) || 0); updateItemTotal(index); }}
                          />
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

                <div className="flex justify-end p-4 border-t border-gray-100 space-y-1">
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
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Параметры КП</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Заявка</Label>
                  <Select value={selectedRequest} onValueChange={(v) => setValue("requestId", v)}>
                    <SelectTrigger><SelectValue placeholder="Не привязано" /></SelectTrigger>
                    <SelectContent>
                      {requests.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>#{r.number} {r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
    </div>
  );
}
