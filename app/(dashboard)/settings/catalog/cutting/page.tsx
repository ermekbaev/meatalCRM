"use client";
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Save, X, Loader2, Scissors, Download, Upload } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const MATERIAL_OPTIONS = [
  { id: "hot-rolled",  label: "Г/К сталь (горячекатаная)" },
  { id: "cold-rolled", label: "Х/К сталь (холоднокатаная)" },
  { id: "galvanized",  label: "Оцинкованная сталь" },
  { id: "stainless",   label: "Нержавейка" },
  { id: "aluminum",    label: "Алюминий" },
];

type Range = { minLength: string; maxLength: string; pricePerMeter: string };

function emptyRange(): Range {
  return { minLength: "", maxLength: "", pricePerMeter: "" };
}

export default function CuttingReferencePage() {
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMaterial, setSelectedMaterial] = useState("hot-rolled");
  const [selectedThickness, setSelectedThickness] = useState<string>("");

  // Editing state
  const [ranges, setRanges] = useState<Range[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add new thickness dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState("hot-rolled");
  const [newThickness, setNewThickness] = useState("");

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

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/catalog/cutting");
    if (res.ok) setAllItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Available thicknesses for selected material
  const thicknessOptions = Array.from(
    new Set(
      allItems
        .filter((i) => i.materialId === selectedMaterial)
        .map((i) => i.thickness)
    )
  ).sort((a, b) => a - b);

  // When material changes, reset thickness selection
  useEffect(() => {
    const available = allItems
      .filter((i) => i.materialId === selectedMaterial)
      .map((i) => i.thickness);
    const sorted = Array.from(new Set(available)).sort((a, b) => a - b);
    setSelectedThickness(sorted.length > 0 ? String(sorted[0]) : "");
    setDirty(false);
  }, [selectedMaterial, allItems]);

  // When thickness changes, load ranges from DB
  useEffect(() => {
    if (!selectedThickness) {
      setRanges([emptyRange()]);
      setDirty(false);
      return;
    }
    const t = parseFloat(selectedThickness);
    const entries = allItems
      .filter((i) => i.materialId === selectedMaterial && i.thickness === t)
      .sort((a: any, b: any) => a.minLength - b.minLength);

    if (entries.length === 0) {
      setRanges([emptyRange()]);
    } else {
      setRanges(
        entries.map((e: any) => ({
          minLength: String(e.minLength),
          maxLength: e.maxLength != null ? String(e.maxLength) : "",
          pricePerMeter: String(e.pricePerMeter),
        }))
      );
    }
    setDirty(false);
  }, [selectedThickness, selectedMaterial, allItems]);

  function updateRange(index: number, field: keyof Range, value: string) {
    setRanges((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setDirty(true);
  }

  function addRange() {
    setRanges((prev) => [...prev, emptyRange()]);
    setDirty(true);
  }

  function removeRange(index: number) {
    setRanges((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  async function save() {
    if (!selectedThickness) return;
    setSaving(true);
    await fetch("/api/catalog/cutting/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialId: selectedMaterial,
        thickness: parseFloat(selectedThickness),
        ranges,
      }),
    });
    await fetchItems();
    setSaving(false);
    setDirty(false);
  }

  function discard() {
    // Re-trigger the thickness effect by toggling dirty
    const t = parseFloat(selectedThickness);
    const entries = allItems
      .filter((i) => i.materialId === selectedMaterial && i.thickness === t)
      .sort((a: any, b: any) => a.minLength - b.minLength);
    if (entries.length === 0) {
      setRanges([emptyRange()]);
    } else {
      setRanges(
        entries.map((e: any) => ({
          minLength: String(e.minLength),
          maxLength: e.maxLength != null ? String(e.maxLength) : "",
          pricePerMeter: String(e.pricePerMeter),
        }))
      );
    }
    setDirty(false);
  }

  async function addNewThickness() {
    if (!newThickness) return;
    // Check if combination already exists
    const exists = allItems.some(
      (i) => i.materialId === newMaterial && i.thickness === parseFloat(newThickness)
    );
    if (exists) {
      setSelectedMaterial(newMaterial);
      setSelectedThickness(newThickness);
      setAddDialogOpen(false);
      return;
    }
    // Switch to that combination with one empty range
    setSelectedMaterial(newMaterial);
    setSelectedThickness(newThickness);
    setRanges([emptyRange()]);
    setDirty(true);
    setAddDialogOpen(false);
  }

  const materialLabel = MATERIAL_OPTIONS.find((m) => m.id === selectedMaterial)?.label ?? selectedMaterial;

  return (
    <div className="flex flex-col h-full">
      <Header title="Цены на резку" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Subtitle + import/export */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Справочник цен для расчёта стоимости резки</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" />
                Экспорт
              </Button>
              <Button size="sm" variant="outline" onClick={() => importInputRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                Импорт
              </Button>
              <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
            </div>
          </div>

          {/* Top controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-sm text-slate-600">Материал:</Label>
              <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_OPTIONS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-sm text-slate-600">Толщина, мм:</Label>
              {thicknessOptions.length > 0 ? (
                <Select value={selectedThickness} onValueChange={setSelectedThickness}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {thicknessOptions.map((t) => (
                      <SelectItem key={t} value={String(t)}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm text-slate-400 italic">—</span>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => {
                setNewMaterial(selectedMaterial);
                setNewThickness("");
                setAddDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Добавить цену
            </Button>
          </div>

          {/* Ranges editor */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : thicknessOptions.length === 0 && !dirty ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center shadow-sm">
              <Scissors className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Нет цен для {materialLabel}</p>
              <p className="text-xs text-slate-400">Нажмите «Добавить цену», чтобы задать тарифы</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3.5">
                <p className="text-sm font-medium text-slate-700">
                  Диапазоны длины и цены
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {materialLabel} · {selectedThickness} мм
                  </span>
                </p>
              </div>

              <div className="p-4 space-y-2">
                {/* Column headers */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-24 text-center text-xs font-medium text-slate-400">От, м</span>
                  <span className="w-4 shrink-0" />
                  <span className="w-24 text-center text-xs font-medium text-slate-400">До, м</span>
                  <span className="w-4 shrink-0" />
                  <span className="w-28 text-center text-xs font-medium text-slate-400">Цена, ₽/м</span>
                </div>

                {ranges.map((range, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      className="w-24 text-center"
                      type="number"
                      min="0"
                      step="1"
                      value={range.minLength}
                      onChange={(e) => updateRange(index, "minLength", e.target.value)}
                      placeholder="0"
                    />
                    <span className="text-slate-300 shrink-0">—</span>
                    <Input
                      className={cn("w-24 text-center", !range.maxLength && "text-slate-400")}
                      type="number"
                      min="0"
                      step="1"
                      value={range.maxLength}
                      onChange={(e) => updateRange(index, "maxLength", e.target.value)}
                      placeholder="∞"
                    />
                    <span className="text-slate-300 shrink-0">:</span>
                    <Input
                      className="w-28 text-center"
                      type="number"
                      min="0"
                      step="0.01"
                      value={range.pricePerMeter}
                      onChange={(e) => updateRange(index, "pricePerMeter", e.target.value)}
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={() => removeRange(index)}
                      className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addRange}
                  className="flex items-center gap-1.5 mt-3 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Добавить диапазон
                </button>
              </div>

              {dirty && (
                <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1.5" />
                    )}
                    Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={discard} className="text-slate-500">
                    <X className="h-4 w-4 mr-1.5" />
                    Отмена
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add new thickness dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить цену резки</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Материал</Label>
              <Select value={newMaterial} onValueChange={setNewMaterial}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_OPTIONS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Толщина, мм</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={newThickness}
                onChange={(e) => setNewThickness(e.target.value)}
                placeholder="напр. 3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Отмена</Button>
            <Button onClick={addNewThickness} disabled={!newThickness}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
