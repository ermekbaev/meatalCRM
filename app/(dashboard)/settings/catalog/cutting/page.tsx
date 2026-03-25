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
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";

const MATERIAL_TABS = [
  { id: "hot-rolled",  label: "Г/К" },
  { id: "cold-rolled", label: "Х/К" },
  { id: "galvanized",  label: "Оцинковка" },
  { id: "stainless",   label: "Нержавейка" },
  { id: "aluminum",    label: "Алюминий" },
];

type FormData = {
  thickness: string;
  minLength: string;
  maxLength: string;
  pricePerMeter: string;
};

export default function CuttingReferencePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("hot-rolled");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>();

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/catalog/cutting");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = items
    .filter((i) => i.materialId === tab)
    .sort((a, b) => a.thickness - b.thickness || a.minLength - b.minLength);

  const openCreate = () => {
    setEditItem(null);
    reset({ thickness: "", minLength: "", maxLength: "", pricePerMeter: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      thickness: String(item.thickness),
      minLength: String(item.minLength),
      maxLength: item.maxLength ? String(item.maxLength) : "",
      pricePerMeter: String(item.pricePerMeter),
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      materialId: tab,
      thickness: parseFloat(data.thickness),
      minLength: parseFloat(data.minLength),
      maxLength: data.maxLength ? parseFloat(data.maxLength) : null,
      pricePerMeter: parseFloat(data.pricePerMeter),
    };
    if (editItem) {
      await fetch(`/api/catalog/cutting/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/catalog/cutting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setDialogOpen(false);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/catalog/cutting/${id}`, { method: "DELETE" });
    fetchItems();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Справочник резки" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
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
              Тарифы резки —{" "}
              <span className="font-medium text-slate-700">
                {MATERIAL_TABS.find((t) => t.id === tab)?.label}
              </span>
            </p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Толщина, мм</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Длина от, мм</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Длина до, мм</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">₽/м.п.</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                      Нет записей. Добавьте тарифы на резку.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">{item.thickness} мм</TableCell>
                      <TableCell>{item.minLength.toLocaleString("ru-RU")}</TableCell>
                      <TableCell>{item.maxLength ? item.maxLength.toLocaleString("ru-RU") : "∞"}</TableCell>
                      <TableCell>{item.pricePerMeter.toLocaleString("ru-RU")} ₽</TableCell>
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
                                  Тариф резки {item.thickness} мм ({item.minLength}–{item.maxLength ?? "∞"} мм) будет удалён.
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editItem ? "Редактировать тариф" : "Добавить тариф резки"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Толщина, мм</Label>
              <Input {...register("thickness", { required: true })} placeholder="4.0" type="number" step="0.1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Длина от, мм</Label>
                <Input {...register("minLength", { required: true })} placeholder="0" type="number" />
              </div>
              <div className="space-y-1.5">
                <Label>Длина до, мм</Label>
                <Input {...register("maxLength")} placeholder="(без ограничений)" type="number" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Цена, ₽/м.п.</Label>
              <Input {...register("pricePerMeter", { required: true })} placeholder="80" type="number" step="0.01" />
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
