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
import { Combobox } from "@/components/ui/combobox";
import { StatusMultiSelect } from "@/components/ui/status-multi-select";
import { getThicknessesForMaterial } from "@/lib/metalReferenceData";
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

const STEEL_GRADE_OPTIONS = [
  "Ст3",
  "Ст3пс",
  "09Г2С",
  "Ст20",
  "45",
  "40Х",
  "AISI 304",
  "AISI 316",
  "AISI 430",
  "12Х18Н10Т",
  "АМг2",
  "АД0",
];

// Запасной список толщин для видов металла, которых нет в ГОСТ-справочнике
// (труба, уголок, швеллер и т.п.)
const FALLBACK_THICKNESS_OPTIONS = [
  "0.4",
  "0.5",
  "0.7",
  "0.8",
  "1.0",
  "1.2",
  "1.5",
  "2.0",
  "2.5",
  "3.0",
  "4.0",
  "5.0",
  "6.0",
  "8.0",
  "10.0",
  "12.0",
  "14.0",
  "16.0",
  "18.0",
  "20.0",
  "25.0",
  "30.0",
];

// Вид металла на складе -> materialId в ГОСТ-справочнике (metalReferenceData)
const METAL_TYPE_TO_MATERIAL_ID: Record<string, string> = {
  "Г/К": "hot-rolled",
  "Х/К": "cold-rolled",
  "Оцинковка": "galvanized",
  "Нержавейка": "stainless",
  "Алюминий": "aluminum",
};

function getThicknessOptions(metalType?: string | null) {
  const materialId = metalType ? METAL_TYPE_TO_MATERIAL_ID[metalType.trim()] : undefined;
  if (!materialId) return FALLBACK_THICKNESS_OPTIONS;
  const gostThicknesses = getThicknessesForMaterial(materialId).map((n) => String(n));
  return gostThicknesses.length ? gostThicknesses : FALLBACK_THICKNESS_OPTIONS;
}

type WarehouseForm = {
  metalType: string;
  steelGrade: string;
  thickness: string;
  size: string;
  unit: string;
  quantity: string;
  note: string;
};

function withCurrent(options: string[], current?: string | null) {
  const value = current?.trim();
  if (!value || options.includes(value)) return options;
  return [value, ...options];
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
  const [metalFilter, setMetalFilter] = useState<string[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string[]>([]);
  const [thicknessFilter, setThicknessFilter] = useState<string[]>([]);
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
      thickness: "",
      size: "",
      unit: UNIT_OPTIONS[0],
      quantity: "0",
      note: "",
    },
  });

  const metalType = useWatch({ control, name: "metalType" });
  const steelGrade = useWatch({ control, name: "steelGrade" });
  const thickness = useWatch({ control, name: "thickness" });
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

  const filterOptions = useMemo(() => {
    const collect = (key: string) =>
      [...new Set(items.map((i) => i[key]).filter(Boolean).map(String))]
        .sort((a, b) => a.localeCompare(b, "ru", { numeric: true }))
        .map((value) => ({ key: value, label: value }));
    return {
      metal: collect("metalType"),
      grade: collect("steelGrade"),
      thickness: collect("thickness"),
    };
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      if (metalFilter.length && !metalFilter.includes(item.metalType)) return false;
      if (gradeFilter.length && !gradeFilter.includes(item.steelGrade)) return false;
      if (thicknessFilter.length && !thicknessFilter.includes(item.thickness)) return false;
      if (!needle) return true;
      return [item.metalType, item.steelGrade, item.thickness, item.size, item.unit, item.note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [items, query, metalFilter, gradeFilter, thicknessFilter]);

  const openCreate = () => {
    setEditItem(null);
    reset({
      metalType: METAL_TYPE_OPTIONS[0],
      steelGrade: "",
      thickness: "",
      size: "",
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
      thickness: item.thickness ?? "",
      size: item.size ?? "",
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
      thickness: data.thickness || null,
      size: data.size || null,
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

        <div className="flex flex-wrap items-center gap-2">
          <StatusMultiSelect
            value={metalFilter}
            onChange={setMetalFilter}
            options={filterOptions.metal}
            allLabel="Все виды металла"
            countLabel="Виды"
          />
          <StatusMultiSelect
            value={gradeFilter}
            onChange={setGradeFilter}
            options={filterOptions.grade}
            allLabel="Все марки стали"
            countLabel="Марки"
          />
          <StatusMultiSelect
            value={thicknessFilter}
            onChange={setThicknessFilter}
            options={filterOptions.thickness}
            allLabel="Все толщины"
            countLabel="Толщины"
          />
          {(metalFilter.length || gradeFilter.length || thicknessFilter.length) > 0 && (
            <button
              type="button"
              onClick={() => {
                setMetalFilter([]);
                setGradeFilter([]);
                setThicknessFilter([]);
              }}
              className="text-sm text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
            >
              Сбросить
            </button>
          )}
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
                {(item.thickness || item.size) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.thickness && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        Толщина: {item.thickness}
                      </span>
                    )}
                    {item.size && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        Размер: {item.size}
                      </span>
                    )}
                  </div>
                )}
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
                <TableHead className="w-24">Толщина</TableHead>
                <TableHead className="w-32">Размер</TableHead>
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
                  <TableCell colSpan={canEdit ? 10 : 9} className="py-10 text-center text-slate-400">
                    Загрузка...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 10 : 9} className="py-10 text-center text-slate-400">
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
                    <TableCell className="text-slate-600">{item.thickness || "—"}</TableCell>
                    <TableCell className="text-slate-600">{item.size || "—"}</TableCell>
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
            <input type="hidden" {...register("steelGrade")} />
            <input type="hidden" {...register("thickness")} />
            <input type="hidden" {...register("unit", { required: true })} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Вид металла</Label>
                <Combobox
                  value={metalType || ""}
                  onChange={(value) => setValue("metalType", value, { shouldDirty: true })}
                  options={withCurrent(METAL_TYPE_OPTIONS, metalType)}
                  placeholder="Выберите металл"
                />
              </div>
              <div className="space-y-2">
                <Label>Марка стали</Label>
                <Combobox
                  value={steelGrade || ""}
                  onChange={(value) => setValue("steelGrade", value, { shouldDirty: true })}
                  options={withCurrent(STEEL_GRADE_OPTIONS, steelGrade)}
                  placeholder="Ст3, 09Г2С, AISI 304"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Толщина</Label>
                <Combobox
                  value={thickness || ""}
                  onChange={(value) => setValue("thickness", value, { shouldDirty: true })}
                  options={withCurrent(getThicknessOptions(metalType), thickness)}
                  placeholder="2.0, 0.5, 10..."
                />
              </div>
              <div className="space-y-2">
                <Label>Размер</Label>
                <Input {...register("size")} placeholder="1250x2500, обрезок 800x300" />
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
              <Textarea {...register("note")} rows={3} placeholder="Место хранения или примечание" />
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
