"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientSearchInput } from "@/components/ClientSearchInput";
import { AssigneeSearchPicker } from "@/components/AssigneeSearchPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  REQUEST_STATUS_LABELS,
  PRIORITY_LABELS,
  PRODUCTION_FIELDS,
  formatCurrency,
} from "@/lib/utils";
import { getUnitOptions } from "@/lib/unit-options";
import { uploadViaPresign } from "@/lib/upload-client";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  BookOpen,
  Paperclip,
  X,
  Factory,
} from "lucide-react";
import Link from "next/link";
import { CatalogPickerDialog } from "@/components/CatalogPickerDialog";

export default function NewRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [vatIncluded, setVatIncluded] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      status: "NEW",
      priority: "MEDIUM",
      clientId: clientId ?? "",
      assigneeId: "",
      items: [] as any[],
      // Производственные подстатусы (как в просмотре заявки). null = «не указано».
      hasMetal: null as string | null,
      metalOwner: null as string | null,
      laserStatus: null as string | null,
      bendingStatus: null as string | null,
      weldingStatus: null as string | null,
      paintingStatus: null as string | null,
      sandblastingStatus: null as string | null,
      extraWorkStatus: null as string | null,
      deliveryStatus: null as string | null,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    // /api/clients отдаёт paginated { items, total, ... } (см. lib/pagination.ts).
    // Берём максимально допустимый pageSize, чтобы в выпадашке хватало контрагентов;
    // если предвыбранный clientId из URL не попал в первую партию, отдельно догружаем
    // его карточку и добавляем в список — иначе ClientSearchInput не покажет badge.
    Promise.all([
      fetch("/api/clients?pageSize=200")
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
      fetch("/api/users")
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/catalog")
        .then((r) => r.json())
        .catch(() => []),
    ]).then(async ([c, u, cat]) => {
      const items: { id: string }[] = Array.isArray(c?.items) ? c.items : Array.isArray(c) ? c : [];
      if (clientId && !items.some((x) => x.id === clientId)) {
        try {
          const res = await fetch(`/api/clients/${clientId}`);
          if (res.ok) {
            const extra = await res.json();
            if (extra?.id) items.push(extra);
          }
        } catch {
          // молча — пользователь увидит пустой поиск и сможет выбрать вручную
        }
      }
      setClients(items);
      setUsers(Array.isArray(u) ? u : []);
      setCatalog(Array.isArray(cat) ? cat : []);
    });
  }, [clientId]);

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

  const addRow = () => {
    append({
      name: "",
      quantity: 1,
      unit: "шт",
      price: 0,
      purchasePrice: null,
      discount: 0,
      total: 0,
      isCustomerMaterial: false,
    });
  };

  const addFromCatalog = (item: any) => {
    append({
      name: item.name,
      quantity: 1,
      unit: item.unit ?? "шт",
      price: item.price ?? 0,
      purchasePrice: item.purchasePrice ?? null,
      discount: 0,
      total: item.price ?? 0,
      isCustomerMaterial: false,
    });
  };

  async function onSubmit(data: any) {
    // Отбрасываем строки с пустым наименованием — это «черновые» позиции,
    // которые пользователь добавил, но не заполнил. Серверная схема требует
    // name >= 1 символа, иначе zod валит весь запрос 400-ой.
    type RequestItemDraft = { name?: string; total?: number };
    const itemsWithTotal = data.items
      .map((item: RequestItemDraft, i: number) => ({ ...item, total: calcTotal(i) }))
      .filter((it: RequestItemDraft) => (it.name ?? "").trim().length > 0);
    const amount = itemsWithTotal.reduce(
      (s: number, it: any) => s + it.total,
      0,
    );

    const body = {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      clientId: data.clientId || null,
      assigneeId: data.assigneeId || null,
      amount: amount || null,
      vatIncluded,
      hasMetal: data.hasMetal,
      metalOwner: data.metalOwner,
      laserStatus: data.laserStatus,
      bendingStatus: data.bendingStatus,
      weldingStatus: data.weldingStatus,
      paintingStatus: data.paintingStatus,
      sandblastingStatus: data.sandblastingStatus,
      extraWorkStatus: data.extraWorkStatus,
      deliveryStatus: data.deliveryStatus,
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

    // Загружаем файлы после создания заявки (через presigned PUT)
    for (const file of pendingFiles) {
      try {
        await uploadViaPresign(`/api/requests/${created.id}/files`, file);
      } catch (err) {
        alert(
          err instanceof Error
            ? `Не удалось загрузить ${file.name}: ${err.message}`
            : `Не удалось загрузить ${file.name}`
        );
      }
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

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Основная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Название заявки *</Label>
                  <Input
                    {...register("title", { required: true })}
                    placeholder="Лазерная резка листового металла"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea
                    {...register("description")}
                    rows={3}
                    placeholder="Подробное описание работ..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Контрагент *</Label>
                  <ClientSearchInput
                    value={selectedClient}
                    onChange={(v) => setValue("clientId", v)}
                    existingClients={clients}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Производство — те же подстатусы, что и в карточке заявки.
                Сделано 1:1 как в /requests/[id], чтобы менеджеру не приходилось
                «дозаполнять» после ручного переноса из портальной заявки. */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Factory className="h-4 w-4 text-slate-400" />
                  Производство
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {PRODUCTION_FIELDS.map((f) => {
                    const current = (watch(f.key) as string | null) ?? null;
                    const opt = current ? f.options.find((o) => o.value === current) : null;
                    return (
                      <div key={f.key} className="space-y-1">
                        <p className="text-xs font-medium text-slate-500">{f.label}</p>
                        <Select
                          value={current ?? "__none__"}
                          onValueChange={(v) =>
                            setValue(f.key, v === "__none__" ? null : v, { shouldDirty: true })
                          }
                        >
                          <SelectTrigger
                            className={`h-8 w-full px-2.5 text-xs rounded-full font-medium border-0 shadow-none ${
                              opt ? opt.className : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
                            }`}
                          >
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs">—</SelectItem>
                            {f.options.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Позиции */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Позиции</CardTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCatalogOpen(true)}
                  >
                    <BookOpen className="mr-1 h-4 w-4" /> Из каталога
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addRow}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Вручную
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {fields.length === 0 ? (
                  <div className="px-6 pb-6 text-center space-y-2">
                    <p className="text-sm text-slate-400 mb-3">Нет позиций</p>
                    <div className="flex justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCatalogOpen(true)}
                      >
                        <BookOpen className="mr-1 h-4 w-4" /> Из каталога
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addRow}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Вручную
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto -mx-px">
                      <table className="min-w-245 text-sm table-fixed">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 w-60">
                              Наименование
                            </th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-24">
                              Кол-во
                            </th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-20">
                              Ед.
                            </th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-32">
                              Цена, ₽
                            </th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-32">
                              Себест., ₽
                            </th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-24">
                              Скидка %
                            </th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-35">
                              Сумма, ₽
                            </th>
                            <th className="px-2 py-2 w-10"></th>
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
                                <Select
                                  value={items[index]?.unit || "шт"}
                                  onValueChange={(value) =>
                                    setValue(`items.${index}.unit`, value, {
                                      shouldDirty: true,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8 w-full px-2 text-sm">
                                    <SelectValue placeholder="шт" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getUnitOptions(items[index]?.unit).map(
                                      (unit) => (
                                        <SelectItem key={unit} value={unit}>
                                          {unit}
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
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
                                  {...register(`items.${index}.purchasePrice`)}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="h-8 text-sm text-right w-full"
                                  placeholder="—"
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
                              <td className="px-2 py-2 text-right text-sm font-medium whitespace-nowrap text-slate-700">
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
                    <div className="border-t border-slate-100 px-4 py-2 flex gap-4">
                      <button
                        type="button"
                        onClick={() => setCatalogOpen(true)}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-orange-500 transition-colors py-1"
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>Из каталога</span>
                      </button>
                      <button
                        type="button"
                        onClick={addRow}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Вручную</span>
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
                          <span className="font-semibold text-slate-800 min-w-20">
                            {formatCurrency(subtotal)}
                          </span>
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
              <CardHeader>
                <CardTitle className="text-base">Параметры</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setValue("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setValue("priority", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ответственный</Label>
                  <AssigneeSearchPicker
                    users={users}
                    value={watch("assigneeId") || null}
                    onChange={(id) => setValue("assigneeId", id ?? "", { shouldDirty: true })}
                  />
                </div>
                {/* НДС */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-700">С НДС</p>
                    <p className="text-xs text-gray-400">
                      НДС 22% включён в цены
                    </p>
                  </div>
                  <Switch
                    checked={vatIncluded}
                    onCheckedChange={setVatIncluded}
                  />
                </div>

                {fields.length > 0 && (
                  <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
                    <p className="text-xs text-slate-500">Сумма по позициям</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {formatCurrency(subtotal)}
                    </p>
                    {vatIncluded && subtotal > 0 && (
                      <p className="text-xs text-slate-400">
                        в т.ч. НДС: {formatCurrency(subtotal - subtotal / 1.2)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Файлы */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Файлы</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-500 hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span>Прикрепить файлы</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.dxf,.rar,.zip,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      setPendingFiles((prev) => [...prev, ...files]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {pendingFiles.length > 0 && (
                  <ul className="space-y-1">
                    {pendingFiles.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5"
                      >
                        <span className="truncate text-xs text-slate-700">
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingFiles((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                          className="shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting && pendingFiles.length > 0
                ? "Создание и загрузка..."
                : "Создать заявку"}
            </Button>
          </div>
        </form>
      </div>

      <CatalogPickerDialog
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onSelect={addFromCatalog}
      />
    </div>
  );
}
