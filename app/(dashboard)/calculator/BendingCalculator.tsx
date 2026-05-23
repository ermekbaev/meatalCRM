"use client";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BENDING_MATERIAL_OPTIONS } from "./_constants";
import { formatCur } from "./_utils";
import { ResultRow } from "./ResultRow";

type BendingCatalogEntry = {
  materialId: string;
  thickness: number;
  price: number;
};

/** Калькулятор стоимости гибки. Цены тянутся из каталога /api/catalog/bending. */
export function BendingCalculator() {
  const [metalType, setMetalType] = useState("hot-rolled");
  const [thickness, setThickness] = useState("");
  const [bendCount, setBendCount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pricePerBend, setPricePerBend] = useState("");
  const [catalogEntries, setCatalogEntries] = useState<BendingCatalogEntry[]>([]);
  const [result, setResult] = useState<{
    costPerPart: number;
    totalCost: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/catalog/bending")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCatalogEntries);
  }, []);

  const availableThicknesses = useMemo(() =>
    [...new Set(
      catalogEntries.filter((e) => e.materialId === metalType).map((e) => e.thickness)
    )].sort((a, b) => a - b),
    [catalogEntries, metalType],
  );

  const hasDbData = availableThicknesses.length > 0;

  const suggestedPrice = useMemo(() => {
    const t = parseFloat(thickness);
    if (!t) return null;
    return catalogEntries.find((e) => e.materialId === metalType && e.thickness === t)?.price ?? null;
  }, [catalogEntries, metalType, thickness]);

  // Автозаполнение цены из каталога
  useEffect(() => {
    if (suggestedPrice != null) setPricePerBend(String(suggestedPrice));
  }, [suggestedPrice]);

  function calculate() {
    const bc = parseInt(bendCount) || 0;
    const q = parseInt(quantity) || 1;
    const ppb = parseFloat(pricePerBend) || 0;
    if (!bc) return;
    const costPerPart = bc * ppb;
    const totalCost = costPerPart * q;
    setResult({ costPerPart, totalCost });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Параметры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Материал</Label>
              <Select
                value={metalType}
                onValueChange={(v) => {
                  setMetalType(v);
                  setThickness("");
                  setPricePerBend("");
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BENDING_MATERIAL_OPTIONS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Толщина, мм</Label>
              {hasDbData ? (
                <Select
                  value={thickness}
                  onValueChange={(v) => { setThickness(v); setResult(null); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выбрать" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableThicknesses.map((t) => (
                      <SelectItem key={t} value={String(t)}>{t} мм</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={thickness}
                  onChange={(e) => { setThickness(e.target.value); setResult(null); }}
                  placeholder="напр. 2"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Кол-во гибов (1 дет.)</Label>
              <Input
                type="number"
                min="0"
                value={bendCount}
                onChange={(e) => { setBendCount(e.target.value); setResult(null); }}
                placeholder="напр. 4"
              />
            </div>
            <div className="space-y-2">
              <Label>Кол-во деталей</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => { setQuantity(e.target.value); setResult(null); }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              Цена за гиб, ₽
              {suggestedPrice != null && (
                <span className="text-xs text-green-600 font-normal">— из каталога</span>
              )}
            </Label>
            <Input
              type="number"
              min="0"
              value={pricePerBend}
              onChange={(e) => { setPricePerBend(e.target.value); setResult(null); }}
              placeholder={hasDbData ? "Выберите толщину" : "напр. 50"}
            />
          </div>

          <Button className="w-full" onClick={calculate}>
            Рассчитать
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Результат</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
              Заполните параметры и нажмите «Рассчитать»
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <ResultRow label="Материал" value={BENDING_MATERIAL_OPTIONS.find((m) => m.id === metalType)?.label ?? metalType} />
                {thickness && (
                  <ResultRow label="Толщина" value={`${thickness} мм`} />
                )}
                <ResultRow label="Гибов на деталь" value={`${bendCount} шт`} />
                <ResultRow label="Кол-во деталей" value={`${quantity} шт`} />
                <ResultRow
                  label="Стоимость 1 детали"
                  value={formatCur(result.costPerPart)}
                  highlight
                />
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Итого за гибку</span>
                  <span className="text-xl font-bold text-white">
                    {formatCur(result.totalCost)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
