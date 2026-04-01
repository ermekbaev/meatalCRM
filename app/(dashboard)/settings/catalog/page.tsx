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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Loader2, Wrench, Package, Folder, FolderOpen, ChevronRight, FolderPlus } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "service", label: "Услуги", icon: Wrench },
  { key: "product", label: "Товары", icon: Package },
];

function ItemRow({ item, onEdit, onDelete, noun }: any) {
  return (
    <TableRow>
      <TableCell className="font-medium text-slate-800">{item.name}</TableCell>
      <TableCell className="text-slate-400 text-[13px]">{item.description ?? "—"}</TableCell>
      <TableCell className="text-slate-500 text-[13px]">{item.unit}</TableCell>
      <TableCell className="font-medium text-slate-700 text-[13px]">
        {item.price ? `${item.price.toLocaleString("ru")} ₽ / ${item.unit}` : "—"}
      </TableCell>
      <TableCell className="text-slate-500 text-[13px]">
        {item.purchasePrice ? `${item.purchasePrice.toLocaleString("ru")} ₽` : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => onEdit(item)}>
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
                <AlertDialogTitle>Удалить {noun}?</AlertDialogTitle>
                <AlertDialogDescription>Позиция будет деактивирована.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(item.id)}>Удалить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ItemsTable({ rows, onEdit, onDelete, noun }: any) {
  return (
    <Table className="table-fixed">
      <colgroup>
        <col style={{ width: "28%" }} />
        <col />
        <col style={{ width: "80px" }} />
        <col style={{ width: "130px" }} />
        <col style={{ width: "130px" }} />
        <col style={{ width: "80px" }} />
      </colgroup>
      <TableHeader>
        <TableRow className="bg-slate-50">
          <TableHead>Название</TableHead>
          <TableHead>Описание</TableHead>
          <TableHead>Ед. изм.</TableHead>
          <TableHead>Цена продажи</TableHead>
          <TableHead>Закуп. цена</TableHead>
          <TableHead>Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item: any) => (
          <ItemRow key={item.id} item={item} noun={noun} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </TableBody>
    </Table>
  );
}

export default function CatalogPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"service" | "product">("service");

  // Выбранная категория: null = показать все, строка id = конкретная папка
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Диалог позиции
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { register, handleSubmit, reset, control, formState: { isSubmitting } } = useForm();

  // Диалог категории
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catParentId, setCatParentId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  const fetchAll = async (currentTab = tab) => {
    setLoading(true);
    const [itemsRes, catsRes] = await Promise.all([
      fetch("/api/catalog"),
      fetch(`/api/catalog/categories?type=${currentTab}`),
    ]);
    const [itemsData, catsData] = await Promise.all([itemsRes.json(), catsRes.json()]);
    setItems(itemsData);
    setCategories(catsData);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Категории верхнего уровня
  const filtered = items.filter((i) => i.type === tab);
  const isService = tab === "service";
  const noun = isService ? "услугу" : "товар";

  // Строим плоский список всех категорий для выпадашки
  const flatCategories: any[] = [];
  const flattenCats = (cats: any[], depth = 0) => {
    cats.forEach((c) => {
      flatCategories.push({ ...c, depth });
      if (c.children?.length) flattenCats(c.children, depth + 1);
    });
  };
  flattenCats(categories);

  // Фильтр позиций по выбранной категории
  const getItemsForCat = (catId: string | null): any[] => {
    if (catId === null) return filtered;
    // Найти все id подкатегорий
    const catIds = new Set<string>();
    const collect = (cats: any[]) => {
      cats.forEach((c) => {
        if (c.id === catId || catIds.has(c.id) || (c.parentId && catIds.has(c.parentId))) {
          catIds.add(c.id);
        }
        if (c.children?.length) collect(c.children);
      });
    };
    // Простой поиск: catId + все дочерние
    const addChildren = (cats: any[]) => {
      cats.forEach((c) => {
        if (c.id === catId) {
          catIds.add(c.id);
          c.children?.forEach((ch: any) => { catIds.add(ch.id); ch.children?.forEach((g: any) => catIds.add(g.id)); });
        }
        if (c.children?.length) addChildren(c.children);
      });
    };
    addChildren(categories);
    return filtered.filter((i) => catIds.has(i.categoryId ?? ""));
  };

  const visibleItems = getItemsForCat(selectedCatId);

  // Позиции без категории
  const uncategorizedItems = filtered.filter((i) => !i.categoryId);

  const toggleExpand = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Отрисовка дерева
  const renderTree = (cats: any[], depth = 0) =>
    cats.map((cat) => {
      const isExpanded = expandedCats.has(cat.id);
      const isSelected = selectedCatId === cat.id;
      const catItems = filtered.filter((i) => i.categoryId === cat.id);
      return (
        <div key={cat.id}>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer group transition-colors",
              isSelected ? "bg-orange-50 text-orange-700" : "hover:bg-slate-100 text-slate-600"
            )}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            {cat.children?.length > 0 ? (
              <button onClick={() => toggleExpand(cat.id)} className="shrink-0">
                <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
              </button>
            ) : (
              <span className="h-3.5 w-3.5 shrink-0" />
            )}
            <span onClick={() => setSelectedCatId(cat.id)} className="flex items-center gap-1.5 flex-1 min-w-0 text-[13px] font-medium">
              {isExpanded || isSelected
                ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                : <Folder className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
              <span className="truncate">{cat.name}</span>
            </span>
            <span className="text-[11px] text-slate-400 shrink-0">{catItems.length}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => { setCatParentId(cat.id); setCatName(""); setCatDialogOpen(true); }}
                className="rounded p-0.5 hover:bg-slate-200"
                title="Добавить подпапку"
              >
                <FolderPlus className="h-3 w-3" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="rounded p-0.5 hover:bg-red-100 text-red-400" title="Удалить папку">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить папку «{cat.name}»?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Позиции останутся без категории. Подпапки переместятся на уровень выше.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteCategory(cat.id)}>Удалить</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          {isExpanded && cat.children?.length > 0 && renderTree(cat.children, depth + 1)}
        </div>
      );
    });

  const deleteCategory = async (id: string) => {
    await fetch(`/api/catalog/categories/${id}`, { method: "DELETE" });
    if (selectedCatId === id) setSelectedCatId(null);
    fetchAll();
  };

  const saveCategory = async () => {
    if (!catName.trim()) return;
    setSavingCat(true);
    await fetch("/api/catalog/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName.trim(), parentId: catParentId, type: tab }),
    });
    setSavingCat(false);
    setCatDialogOpen(false);
    fetchAll();
  };

  const openCreate = () => {
    setEditItem(null);
    reset({ name: "", description: "", unit: "шт", price: "", purchasePrice: "", categoryId: selectedCatId ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({ ...item, price: item.price ?? "", purchasePrice: item.purchasePrice ?? "", categoryId: item.categoryId ?? "" });
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    const body = {
      name: data.name,
      description: data.description ?? null,
      unit: data.unit,
      price: data.price ? parseFloat(data.price) : null,
      purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : null,
      categoryId: data.categoryId || null,
      type: editItem ? editItem.type : tab,
    };
    const url = editItem ? `/api/catalog/${editItem.id}` : "/api/catalog";
    const method = editItem ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/catalog/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const displayItems = selectedCatId === null
    ? null  // показываем всё по секциям ниже
    : visibleItems;

  return (
    <div>
      <Header title="Справочник" />
      <div className="p-6 space-y-4">
        {/* Вкладки */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key as any); setSelectedCatId(null); fetchAll(key as any); }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all",
                tab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-5 items-start">
          {/* Панель категорий */}
          <div className="w-56 shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
              <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Папки</span>
              <button
                onClick={() => { setCatParentId(null); setCatName(""); setCatDialogOpen(true); }}
                className="rounded p-1 hover:bg-slate-100 text-slate-400"
                title="Новая папка"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-1.5 space-y-0.5">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-[13px] font-medium transition-colors",
                  selectedCatId === null ? "bg-orange-50 text-orange-700" : "hover:bg-slate-100 text-slate-600"
                )}
                onClick={() => setSelectedCatId(null)}
              >
                <Folder className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">Все позиции</span>
                <span className="text-[11px] text-slate-400">{filtered.length}</span>
              </div>
              {renderTree(categories)}
              {uncategorizedItems.length > 0 && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-[13px] font-medium transition-colors",
                    selectedCatId === "__none__" ? "bg-slate-100 text-slate-800" : "hover:bg-slate-100 text-slate-500"
                  )}
                  onClick={() => setSelectedCatId("__none__")}
                >
                  <Folder className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <span className="flex-1 italic">Без папки</span>
                  <span className="text-[11px] text-slate-400">{uncategorizedItems.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Основной контент */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-slate-400">
                {selectedCatId === null
                  ? `${filtered.length} ${isService ? "услуг" : "товаров"} в каталоге`
                  : selectedCatId === "__none__"
                  ? `${uncategorizedItems.length} позиций без папки`
                  : `${visibleItems.length} позиций в папке`}
              </p>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Добавить {noun}</Button>
            </div>

            {loading ? (
              <div className="flex h-32 items-center justify-center text-slate-400 text-[13px]">Загрузка...</div>
            ) : selectedCatId === "__none__" ? (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <ItemsTable rows={uncategorizedItems} noun={noun} onEdit={openEdit} onDelete={handleDelete} />
              </div>
            ) : selectedCatId !== null ? (
              visibleItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex h-32 items-center justify-center text-slate-400 text-[13px]">
                  Нет позиций в этой папке
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <ItemsTable rows={visibleItems} noun={noun} onEdit={openEdit} onDelete={handleDelete} />
                </div>
              )
            ) : (
              // Все позиции: сгруппировано по папкам
              filtered.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex h-32 items-center justify-center text-slate-400 text-[13px]">
                  Справочник пуст
                </div>
              ) : (
                <div className="space-y-3">
                  {flatCategories.map((cat) => {
                    const catItems = filtered.filter((i) => i.categoryId === cat.id);
                    if (!catItems.length) return null;
                    return (
                      <div key={cat.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                          {"  ".repeat(cat.depth)}
                          <Folder className="h-4 w-4 text-orange-400 shrink-0" />
                          <span className="text-[13px] font-semibold text-slate-700">{cat.name}</span>
                          <span className="text-[11px] text-slate-400">{catItems.length} позиций</span>
                        </div>
                        <ItemsTable rows={catItems} noun={noun} onEdit={openEdit} onDelete={handleDelete} />
                      </div>
                    );
                  })}
                  {uncategorizedItems.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                        <Folder className="h-4 w-4 text-slate-300 shrink-0" />
                        <span className="text-[13px] font-semibold text-slate-500 italic">Без папки</span>
                        <span className="text-[11px] text-slate-400">{uncategorizedItems.length} позиций</span>
                      </div>
                      <ItemsTable rows={uncategorizedItems} noun={noun} onEdit={openEdit} onDelete={handleDelete} />
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Диалог добавления/редактирования позиции */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editItem ? `Редактировать ${editItem.type === "product" ? "товар" : "услугу"}` : `Новый ${noun}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input {...register("name", { required: true })} placeholder={isService ? "Лазерная резка" : "Металлический лист"} />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea {...register("description")} rows={2} placeholder="Описание..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Папка</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Без папки" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Без папки</SelectItem>
                        {flatCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {"  ".repeat(c.depth)}{c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Единица измерения</Label>
                <Input {...register("unit")} placeholder="шт, м², кг" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Цена продажи (₽)</Label>
                <Input {...register("price")} type="number" min="0" step="0.01" placeholder="1500" />
              </div>
              <div className="space-y-2">
                <Label>Закупочная цена (₽)</Label>
                <Input {...register("purchasePrice")} type="number" min="0" step="0.01" placeholder="1000" />
              </div>
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

      {/* Диалог создания папки */}
      <Dialog open={catDialogOpen} onOpenChange={(o) => !o && setCatDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{catParentId ? "Новая подпапка" : "Новая папка"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {catParentId && (
              <p className="text-sm text-slate-500">
                В папке: <span className="font-medium">{flatCategories.find((c) => c.id === catParentId)?.name}</span>
              </p>
            )}
            <Input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Название папки"
              onKeyDown={(e) => { if (e.key === "Enter") saveCategory(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Отмена</Button>
            <Button onClick={saveCategory} disabled={savingCat || !catName.trim()}>
              {savingCat && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
