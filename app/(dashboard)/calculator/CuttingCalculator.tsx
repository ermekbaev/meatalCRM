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
import { CUT_TYPES, CUTTING_MATERIAL_OPTIONS } from "./_constants";
import { formatNum, formatCur } from "./_utils";
import { ResultRow } from "./ResultRow";

type CuttingCatalogEntry = {
  materialId: string;
  thickness: number;
  minLength: number;
  maxLength: number | null;
  pricePerMeter: number;
};

/** Калькулятор стоимости резки. Цены тянутся из /api/catalog/cutting. */
export function CuttingCalculator() {
  const [cutType, setCutType] = useState("laser");
  const [metalType, setMetalType] = useState("hot-rolled");
  const [thickness, setThickness] = useState("");
  const [cutLength, setCutLength] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [costPerMeter, setCostPerMeter] = useState("");
  const [result, setResult] = useState<{
    totalLength: number;
    totalCost: number;
  } | null>(null);
  const [catalogEntries, setCatalogEntries] = useState<CuttingCatalogEntry[]>([]);

  useEffect(() => {
    fetch("/api/catalog/cutting")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCatalogEntries);
  }, []);

  // Thicknesses available in DB for selected material
  const availableThicknesses = Array.from(
    new Set(
      catalogEntries
        .filter((e) => e.materialId === metalType)
        .map((e) => e.thickness),
    ),
  ).sort((a, b) => a - b);

  // Suggest price from DB based on metal, thickness, and total cut length (in meters)
  const totalLengthM =
    (parseFloat(cutLength) || 0) * (parseInt(quantity) || 1);

  const suggestedPrice = useMemo(() => {
    const t = parseFloat(thickness);
    if (!t || !totalLengthM) return null;
    const entries = catalogEntries
      .filter((e) => e.materialId === metalType && e.thickness === t)
      .sort((a, b) => a.minLength - b.minLength);
    if (entries.length === 0) return null;
    for (const e of entries) {
      if (
        totalLengthM >= e.minLength &&
        (e.maxLength == null || totalLengthM <= e.maxLength)
      ) {
        return e.pricePerMeter;
      }
    }
    // Use last range if beyond all defined
    return entries[entries.length - 1].pricePerMeter;
  }, [catalogEntries, metalType, thickness, totalLengthM]);

  const hasDbData = availableThicknesses.length > 0;

  function calculate() {
    const l = parseFloat(cutLength) || 0;
    const q = parseInt(quantity) || 1;
    const cpm = parseFloat(costPerMeter) || 0;
    if (!l) return;
    const totalLength = l * q;
    const totalCost = totalLength * cpm;
    setResult({ totalLength, totalCost });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Параметры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Тип резки</Label>
            <Select
              value={cutType}
              onValueChange={(v) => {
                setCutType(v);
                setResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUT_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Вид металла</Label>
              <Select
                value={metalType}
                onValueChange={(v) => {
                  setMetalType(v);
                  setThickness("");
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUTTING_MATERIAL_OPTIONS.map((m) => (
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
                  onValueChange={(v) => {
                    setThickness(v);
                    setResult(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выбрать" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableThicknesses.map((t) => (
                      <SelectItem key={t} value={String(t)}>
                        {t} мм
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={thickness}
                  onChange={(e) => {
                    setThickness(e.target.value);
                    setResult(null);
                  }}
                  placeholder="напр. 3"
                />
              )}
            </div>
          </div>

          {!hasDbData && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Справочник цен резки пуст. Заполните его в{" "}
              <span className="font-medium">Настройки → Резка</span>.
            </div>
          )}

          {suggestedPrice !== null && (
            <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-xs text-blue-700">
                По справочнику для {formatNum(totalLengthM)} м:{" "}
                <span className="font-bold">{suggestedPrice} ₽/м</span>
              </p>
              <button
                type="button"
                onClick={() => setCostPerMeter(String(suggestedPrice))}
                className="ml-3 shrink-0 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Применить
              </button>
            </div>
          )}

          <div className="space-y-2">
            <Label>Длина реза, м</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={cutLength}
              onChange={(e) => {
                setCutLength(e.target.value);
                setResult(null);
              }}
              placeholder="напр. 5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Кол-во деталей</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setResult(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Цена, ₽/м</Label>
              <Input
                type="number"
                min="0"
                value={costPerMeter}
                onChange={(e) => {
                  setCostPerMeter(e.target.value);
                  setResult(null);
                }}
                placeholder="₽/м"
              />
            </div>
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
                <ResultRow
                  label="Тип резки"
                  value={
                    CUT_TYPES.find((t) => t.id === cutType)?.label ?? cutType
                  }
                />
                <ResultRow
                  label="Вид металла"
                  value={
                    CUTTING_MATERIAL_OPTIONS.find((m) => m.id === metalType)
                      ?.label ?? metalType
                  }
                />
                {thickness && (
                  <ResultRow label="Толщина" value={`${thickness} мм`} />
                )}
                <ResultRow
                  label="Длина реза (1 дет.)"
                  value={`${formatNum(parseFloat(cutLength))} м`}
                />
                <ResultRow label="Кол-во деталей" value={`${quantity} шт`} />
                <ResultRow
                  label="Общая длина реза"
                  value={`${formatNum(result.totalLength)} м`}
                  highlight
                />
                <ResultRow label="Цена за метр" value={`${costPerMeter} ₽/м`} />
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">
                    Стоимость резки
                  </span>
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
