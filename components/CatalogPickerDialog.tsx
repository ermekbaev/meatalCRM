"use client";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Folder, FolderOpen, ChevronRight, Package, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  unit: string;
  price?: number | null;
  category?: string | null;
  type: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (item: CatalogItem) => void;
}

type Tab = "service" | "product";

export function CatalogPickerDialog({ open, onClose, onSelect }: Props) {
  const [allItems, setAllItems] = useState<CatalogItem[]>([]);
  const [tab, setTab] = useState<Tab>("service");
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSearch("");
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((data: any[]) => {
        const normalized: CatalogItem[] = data.map((i) => ({
          ...i,
          category: i.catalogCategory?.name || i.category || null,
        }));
        setAllItems(normalized);
      })
      .catch(() => {});
  }, [open]);

  const items = useMemo(() => allItems.filter((i) => i.type === tab), [allItems, tab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const categories = useMemo(() => {
    const cats = [...new Set(filtered.map((i) => i.category || "Без категории"))];
    return cats.sort((a, b) => {
      if (a === "Без категории") return 1;
      if (b === "Без категории") return -1;
      return a.localeCompare(b, "ru");
    });
  }, [filtered]);

  // Открываем все категории при смене таба или поиске
  useEffect(() => {
    setOpenCats(new Set(categories));
  }, [tab, search]);

  const toggleCat = (cat: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const handleSelect = (item: CatalogItem) => {
    onSelect(item);
    onClose();
  };

  const serviceCount = allItems.filter((i) => i.type === "service").length;
  const productCount = allItems.filter((i) => i.type === "product").length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col p-0 gap-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle>Выбор позиции из каталога</DialogTitle>
        </DialogHeader>

        {/* Табы */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => { setTab("service"); setSearch(""); }}
            className={cn(
              "flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors",
              tab === "service"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <Wrench className="h-3.5 w-3.5" />
            Услуги
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{serviceCount}</span>
          </button>
          <button
            onClick={() => { setTab("product"); setSearch(""); }}
            className={cn(
              "flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors",
              tab === "product"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <Package className="h-3.5 w-3.5" />
            Товары
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{productCount}</span>
          </button>
        </div>

        {/* Поиск */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Поиск по названию, категории..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto">
          {allItems.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">
              Загрузка...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">
              Ничего не найдено
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = filtered.filter(
                (i) => (i.category || "Без категории") === cat,
              );
              const isOpen = openCats.has(cat);
              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCat(cat)}
                    className="flex w-full items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-left transition-colors hover:bg-slate-100"
                  >
                    {isOpen ? (
                      <FolderOpen className="h-4 w-4 shrink-0 text-orange-500" />
                    ) : (
                      <Folder className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="flex-1 text-[13px] font-semibold text-slate-700">{cat}</span>
                    <span className="text-[11px] text-slate-400">{catItems.length}</span>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 text-slate-400 transition-transform",
                        isOpen && "rotate-90",
                      )}
                    />
                  </button>

                  {isOpen &&
                    catItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className="flex w-full items-center gap-3 border-b border-slate-50 px-5 py-2.5 text-left transition-colors hover:bg-orange-50 last:border-0"
                      >
                        {item.type === "product" ? (
                          <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        ) : (
                          <Wrench className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                          {item.description && (
                            <p className="truncate text-[11px] text-slate-400">{item.description}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-medium text-slate-700">
                            {item.price != null ? `${item.price.toLocaleString("ru")} ₽` : "—"}
                          </p>
                          <p className="text-[10px] text-slate-400">{item.unit}</p>
                        </div>
                      </button>
                    ))}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
