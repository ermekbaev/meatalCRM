"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REQUEST_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/utils";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";

export default function NewRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: "",
      description: "",
      status: "NEW",
      priority: "MEDIUM",
      clientId: clientId ?? "",
      assigneeId: "",
      amount: "",
    },
  });

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

  const status = watch("status");
  const priority = watch("priority");
  const selectedClient = watch("clientId");

  const toggleService = (name: string) => {
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  async function onSubmit(data: any) {
    const body = {
      ...data,
      amount: data.amount ? parseFloat(data.amount) : null,
      assigneeId: data.assigneeId || null,
      services: selectedServices,
    };
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const created = await res.json();
    router.push(`/requests/${created.id}`);
  }

  const categories = [...new Set(catalog.map((c: any) => c.category).filter(Boolean))];

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
                  <Textarea {...register("description")} rows={4} placeholder="Подробное описание работ..." />
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

            {/* Services */}
            <Card>
              <CardHeader><CardTitle className="text-base">Услуги</CardTitle></CardHeader>
              <CardContent>
                {categories.length > 0 ? (
                  <div className="space-y-4">
                    {categories.map((cat) => (
                      <div key={cat as string}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{cat as string}</p>
                        <div className="flex flex-wrap gap-2">
                          {catalog
                            .filter((s: any) => s.category === cat)
                            .map((s: any) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleService(s.name)}
                                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                                  selectedServices.includes(s.name)
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                }`}
                              >
                                {s.name}
                                {s.price && <span className="ml-1 text-xs opacity-60">{s.price} ₽/{s.unit}</span>}
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Справочник услуг пуст</p>
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
                <div className="space-y-2">
                  <Label>Сумма (₽)</Label>
                  <Input {...register("amount")} type="number" placeholder="0" />
                </div>
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
