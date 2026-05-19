"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UNIT_OPTIONS, getUnitOptions } from "@/lib/unit-options";
import { formatDateTime } from "@/lib/utils";
import { Loader2, PackagePlus, Pencil, Search, Trash2, Warehouse } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

const METAL_TYPE_OPTIONS = [
  "Г/К",
  "Х/К",
  "Оцинковка",
  "Нержавейка",
  "Алюминий",
  "Рифленый лист",
  "Швеллер",
  "Труба",
  "Уголок",
  "Полоса",
  "Круг",
];

type WarehouseForm = {
  metalType: string;
  steelGrade: string;
  unit: string;
  quantity: string;
  note: string;
};

function getMetalTypeOptions(current?: string | null) {
  const value = current?.trim();
  if (!value || METAL_TYPE_OPTIONS.includes(value)) return METAL_TYPE_OPTIONS;
  return [value, ...METAL_TYPE_OPTIONS];
}

function formatQuantity(value: number) {
  return Number(value || 0).toLocaleString("ru", {
    maximumFractionDigits: 3,
  });
}

export default function WarehousePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canEdit = role === "ADMIN";

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<WarehouseForm>({
    defaultValues: {
      metalType: METAL_TYPE_OPTIONS[0],
      steelGrade: "",
      unit: UNIT_OPTIONS[0],
      quantity: "0",
      note: "",
    },
  });

  const metalType = useWatch({ control, name: "metalType" });
  const unit = useWatch({ control, name: "unit" });

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/warehouse");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((item) =>
      [item.metalType, item.steelGrade, item.unit, item.note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [items, query]);

  const openCreate = () => {
    setEditItem(null);
    reset({
      metalType: METAL_TYPE_OPTIONS[0],
      steelGrade: "",
      unit: UNIT_OPTIONS[0],
      quantity: "0",
      note: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      metalType: item.metalType ?? METAL_TYPE_OPTIONS[0],
      steelGrade: item.steelGrade ?? "",
      unit: item.unit ?? UNIT_OPTIONS[0],
      quantity: String(item.quantity ?? 0),
      note: item.note ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: WarehouseForm) => {
    const payload = {
      metalType: data.metalType,
      steelGrade: data.steelGrade || null,
      unit: data.unit || UNIT_OPTIONS[0],
      quantity: parseFloat(data.quantity) || 0,
      note: data.note || null,
    };
    const url = editItem ? `/api/warehouse/${editItem.id}` : "/api/warehouse";
    const method = editItem ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Не удалось сохранить остаток");
      return;
    }

    setDialogOpen(false);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/warehouse/${id}`, { method: "DELETE" });
    fetchItems();
  };

  return (
    <div>
      <Header title="Склад" />
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              {filtered.length} позиций в остатках
            </p>
            {!canEdit && (
              <p className="mt-1 text-xs text-slate-400">
                Просмотр доступен всем, редактирование только администратору.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск..."
                className="pl-9"
              />
            </div>
            {canEdit && (
              <Button onClick={openCreate}>
                <PackagePlus className="mr-2 h-4 w-4" />
                Добавить
              </Button>
            )}
          </div>
        </div>

        <div className="md:hidden space-y-2">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
              Загрузка...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
              Остатков пока нет
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{item.metalType}</p>
                    <p className="text-xs text-slate-500">
                      {item.steelGrade || "Марка не указана"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-slate-900">
                      {formatQuantity(item.quantity)} {item.unit}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.updatedBy?.name || "—"}
                    </p>
                  </div>
                </div>
                {item.note && <p className="mt-2 text-xs text-slate-500">{item.note}</p>}
                {canEdit && (
                  <div className="mt-3 flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить позицию?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Позиция будет скрыта из остатков.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteItem(item.id)}>
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Вид металла</TableHead>
                <TableHead>Марка стали</TableHead>
                <TableHead className="w-36 text-right">Количество</TableHead>
                <TableHead className="w-24">Ед. изм.</TableHead>
                <TableHead>Комментарий</TableHead>
                <TableHead className="w-40">Обновлено</TableHead>
                <TableHead className="w-36">Кто изменил</TableHead>
                {canEdit && <TableHead className="w-24">Действия</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="py-10 text-center text-slate-400">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="py-10 text-center text-slate-400">
                    Остатков пока нет
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-orange-400" />
                        <span className="font-medium text-slate-800">{item.metalType}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.steelGrade || "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {formatQuantity(item.quantity)}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="max-w-[17.5rem] truncate text-slate-500">
                      {item.note || "—"}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDateTime(item.updatedAt)}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {item.updatedBy?.name || "—"}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить позицию?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Позиция будет скрыта из остатков.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteItem(item.id)}>
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Редактировать остаток" : "Новый остаток"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("metalType", { required: true })} />
            <input type="hidden" {...register("unit", { required: true })} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Вид металла</Label>
                <Select
                  value={metalType || METAL_TYPE_OPTIONS[0]}
                  onValueChange={(value) =>
                    setValue("metalType", value, { shouldDirty: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите металл" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMetalTypeOptions(metalType).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Марка стали</Label>
                <Input {...register("steelGrade")} placeholder="СТ3, 09Г2С, AISI 304" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input
                  {...register("quantity", { required: true })}
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Единица измерения</Label>
                <Select
                  value={unit || UNIT_OPTIONS[0]}
                  onValueChange={(value) =>
                    setValue("unit", value, { shouldDirty: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="шт" />
                  </SelectTrigger>
                  <SelectContent>
                    {getUnitOptions(unit).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Комментарий</Label>
              <Textarea {...register("note")} rows={3} placeholder="Размер, место хранения или примечание" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editItem ? "Сохранить" : "Добавить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
