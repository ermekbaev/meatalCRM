"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

export default function CatalogPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch("/api/catalog");
    setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setEditItem(null);
    reset({ name: "", description: "", unit: "шт", price: "", category: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset(item);
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    const body = { ...data, price: data.price ? parseFloat(data.price) : null };
    const url = editItem ? `/api/catalog/${editItem.id}` : "/api/catalog";
    const method = editItem ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/catalog/${id}`, { method: "DELETE" });
    fetchItems();
  };

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const uncategorized = items.filter((i) => !i.category);

  const ItemRow = ({ item }: { item: any }) => (
    <TableRow key={item.id}>
      <TableCell className="font-medium text-slate-800">{item.name}</TableCell>
      <TableCell className="text-slate-400 text-[13px]">{item.description ?? "—"}</TableCell>
      <TableCell className="text-slate-500 text-[13px]">{item.unit}</TableCell>
      <TableCell className="font-medium text-slate-700 text-[13px]">
        {item.price ? `${item.price.toLocaleString("ru")} ₽ / ${item.unit}` : "—"}
      </TableCell>
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
                <AlertDialogTitle>Удалить услугу?</AlertDialogTitle>
                <AlertDialogDescription>Услуга будет деактивирована.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(item.id)}>Удалить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );

  const CategorySection = ({ title, rows }: { title?: string; rows: any[] }) => (
    <div className="space-y-1">
      {title && (
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      )}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table className="table-fixed">
          <colgroup>
            <col style={{ width: "30%" }} />
            <col />
            <col style={{ width: "96px" }} />
            <col style={{ width: "144px" }} />
            <col style={{ width: "80px" }} />
          </colgroup>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Название</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Ед. изм.</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => <ItemRow key={item.id} item={item} />)}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div>
      <Header title="Справочник услуг" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-slate-400">{items.length} услуг в каталоге</p>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Добавить услугу</Button>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-slate-400 text-[13px]">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex h-32 items-center justify-center text-slate-400 text-[13px]">
            Справочник пуст
          </div>
        ) : (
          <div className="space-y-5">
            {categories.map((cat) => (
              <CategorySection
                key={cat as string}
                title={cat as string}
                rows={items.filter((i) => i.category === cat)}
              />
            ))}
            {uncategorized.length > 0 && (
              <CategorySection
                title={categories.length > 0 ? "Без категории" : undefined}
                rows={uncategorized}
              />
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Редактировать услугу" : "Новая услуга"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input {...register("name", { required: true })} placeholder="Лазерная резка" />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea {...register("description")} rows={2} placeholder="Описание услуги..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Категория</Label>
                <Input
                  {...register("category")}
                  placeholder="Резка"
                  list="category-list"
                  autoComplete="off"
                />
                <datalist id="category-list">
                  {categories.map((cat) => (
                    <option key={cat as string} value={cat as string} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Единица измерения</Label>
                <Input {...register("unit")} placeholder="м², шт, час" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Базовая цена (₽)</Label>
              <Input {...register("price")} type="number" min="0" step="0.01" placeholder="1500" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
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
