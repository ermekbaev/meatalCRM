"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, Loader2, Upload, Download } from "lucide-react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { ALL_METAL_ENTRIES } from "@/lib/metalReferenceData";

const MATERIAL_TABS = [
  { id: "hot-rolled",  label: "Г/К" },
  { id: "cold-rolled", label: "Х/К" },
  { id: "galvanized",  label: "Оцинковка" },
  { id: "stainless",   label: "Нержавейка" },
  { id: "aluminum",    label: "Алюминий" },
];

type FormData = {
  thickness: string;
  width: string;
  length: string;
  massPerSqM: string;
  sheetMass: string;
};

export default function MetalsReferencePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("hot-rolled");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [seeding, setSeeding] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<FormData>();

  const watchedWidth = watch("width");
  const watchedLength = watch("length");
  const watchedSheetMass = watch("sheetMass");
  const watchedMassPerSqM = watch("massPerSqM");

  // Автовычисление кг/м² при изменении массы листа
  useEffect(() => {
    const w = parseFloat(watchedWidth);
    const l = parseFloat(watchedLength);
    const m = parseFloat(watchedSheetMass);
    if (w > 0 && l > 0 && m > 0) {
      const area = (w / 1000) * (l / 1000);
      setValue("massPerSqM", String(parseFloat((m / area).toFixed(4))), { shouldDirty: false });
    }
  }, [watchedSheetMass, watchedWidth, watchedLength, setValue]);

  // Автовычисление массы листа при изменении кг/м²
  useEffect(() => {
    const w = parseFloat(watchedWidth);
    const l = parseFloat(watchedLength);
    const mpsm = parseFloat(watchedMassPerSqM);
    if (w > 0 && l > 0 && mpsm > 0 && !watchedSheetMass) {
      const area = (w / 1000) * (l / 1000);
      setValue("sheetMass", String(parseFloat((mpsm * area).toFixed(2))), { shouldDirty: false });
    }
  }, [watchedMassPerSqM, watchedWidth, watchedLength, watchedSheetMass, setValue]);

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/catalog/metals");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter((i) => i.materialId === tab);

  const openCreate = () => {
    setEditItem(null);
    reset({ thickness: "", width: "", length: "", massPerSqM: "", sheetMass: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      thickness: String(item.thickness),
      width: String(item.width),
      length: String(item.length),
      massPerSqM: String(item.massPerSqM),
      sheetMass: String(item.sheetMass),
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      materialId: tab,
      thickness: parseFloat(data.thickness),
      width: parseInt(data.width),
      length: parseInt(data.length),
      massPerSqM: parseFloat(data.massPerSqM),
      sheetMass: parseFloat(data.sheetMass),
    };
    let res: Response;
    if (editItem) {
      res = await fetch(`/api/catalog/metals/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/catalog/metals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      alert("Ошибка при сохранении записи");
      return;
    }
    setDialogOpen(false);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/catalog/metals/${id}`, { method: "DELETE" });
    fetchItems();
  };

  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    const res = await fetch("/api/catalog/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalog-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const result = await res.json();
      if (result.errors?.length) {
        alert("Импорт завершён с ошибками:\n" + result.errors.join("\n"));
      } else {
        alert(`Импорт успешен: резка — ${result.imported.cutting} диапазонов, гибка — ${result.imported.bending}, металлы — ${result.imported.metals}`);
      }
      await fetchItems();
    } catch {
      alert("Ошибка: не удалось прочитать файл");
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  const seedFromGost = async () => {
    setSeeding(true);
    for (const entry of ALL_METAL_ENTRIES) {
      await fetch("/api/catalog/metals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    }
    await fetchItems();
    setSeeding(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Справочник металлов" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            {MATERIAL_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                  tab === t.id
                    ? "bg-white shadow text-slate-800"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {filtered.length} записей для{" "}
              <span className="font-medium text-slate-700">
                {MATERIAL_TABS.find((t) => t.id === tab)?.label}
              </span>
            </p>
            <div className="flex gap-2">
              {items.length === 0 && (
                <Button variant="outline" size="sm" onClick={seedFromGost} disabled={seeding}>
                  {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Загрузить ГОСТ данные
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" />
                Экспорт
              </Button>
              <Button size="sm" variant="outline" onClick={() => importInputRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                Импорт
              </Button>
              <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Толщина, мм</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ширина, мм</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Длина, мм</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">кг/м²</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Масса листа, кг</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                      Нет записей. Добавьте вручную или загрузите данные ГОСТ.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">{item.thickness}</TableCell>
                      <TableCell>{item.width}</TableCell>
                      <TableCell>{item.length}</TableCell>
                      <TableCell>{item.massPerSqM}</TableCell>
                      <TableCell>{item.sheetMass}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Толщина {item.thickness} мм, {item.width}×{item.length} мм будет удалена.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteItem(item.id)}
                                >
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Редактировать запись" : "Добавить запись"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Толщина, мм</Label>
                <Input {...register("thickness", { required: true })} placeholder="4.0" type="number" step="0.1" />
              </div>
              <div className="space-y-1.5">
                <Label>Ширина, мм</Label>
                <Input {...register("width", { required: true })} placeholder="1500" type="number" />
              </div>
              <div className="space-y-1.5">
                <Label>Длина, мм</Label>
                <Input {...register("length", { required: true })} placeholder="6000" type="number" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Масса листа, кг</Label>
                <Input {...register("sheetMass", { required: true })} placeholder="282.6" type="number" step="0.01" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  кг/м²
                  <span className="text-xs text-slate-400 font-normal">— рассчитывается автоматически</span>
                </Label>
                <Input {...register("massPerSqM", { required: true })} placeholder="рассчитается из массы" type="number" step="0.0001" className="bg-slate-50" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editItem ? "Сохранить" : "Добавить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
