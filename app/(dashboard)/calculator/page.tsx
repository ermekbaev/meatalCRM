"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Calculator, Scissors, Layers } from "lucide-react";

// ─── Типы материалов ────────────────────────────────────────────────────────
const MATERIALS = [
  { id: "hot-rolled",  label: "Сталь горячекатаная",  density: 7850 },
  { id: "cold-rolled", label: "Сталь холоднокатаная",  density: 7850 },
  { id: "galvanized",  label: "Оцинкованный лист",     density: 7850 },
  { id: "stainless",   label: "Нержавеющая сталь",     density: 7930 },
  { id: "aluminum",    label: "Алюминий",               density: 2700 },
  { id: "copper",      label: "Медь",                   density: 8900 },
  { id: "brass",       label: "Латунь",                 density: 8500 },
  { id: "titanium",    label: "Титан",                  density: 4500 },
];

const DENSITY_OPTIONS: Record<string, { label: string; value: number }[]> = {
  stainless: [
    { label: "AISI 304 (7930 кг/м³)", value: 7930 },
    { label: "AISI 316 (8000 кг/м³)", value: 8000 },
    { label: "AISI 430 (7700 кг/м³)", value: 7700 },
  ],
  aluminum: [
    { label: "1050 / 1060 (2700 кг/м³)", value: 2700 },
    { label: "5083 (2650 кг/м³)", value: 2650 },
    { label: "6061 / 6082 (2700 кг/м³)", value: 2700 },
    { label: "7075 (2810 кг/м³)", value: 2810 },
  ],
};

const CUT_TYPES = [
  { id: "laser",  label: "Лазерная резка" },
  { id: "plasma", label: "Плазменная резка" },
  { id: "hydro",  label: "Гидроабразивная резка" },
  { id: "mech",   label: "Механическая резка" },
];

const BENDING_METALS = ["Сталь", "Нержавеющая сталь", "Алюминий", "Медь", "Латунь"];

function formatNum(n: number, decimals = 2) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function formatCur(n: number) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₽";
}

// ─── Таб: Металл ─────────────────────────────────────────────────────────────
function MetalCalculator() {
  const [materialId, setMaterialId] = useState("hot-rolled");
  const [density, setDensity] = useState(7850);
  const [thickness, setThickness] = useState("");
  const [width, setWidth] = useState("1500");
  const [length, setLength] = useState("6000");
  const [quantity, setQuantity] = useState("1");
  const [pricePerTon, setPricePerTon] = useState("78000");
  const [result, setResult] = useState<{
    massPerSheet: number; totalMass: number; cost: number; area: number;
  } | null>(null);

  const material = MATERIALS.find(m => m.id === materialId)!;
  const hasDensityOptions = !!DENSITY_OPTIONS[materialId];

  function handleMaterialChange(id: string) {
    setMaterialId(id);
    const mat = MATERIALS.find(m => m.id === id)!;
    setDensity(mat.density);
    setResult(null);
  }

  function calculate() {
    const t = parseFloat(thickness) / 1000;
    const w = parseFloat(width) / 1000;
    const l = parseFloat(length) / 1000;
    const q = parseInt(quantity) || 1;
    const ppt = parseFloat(pricePerTon) || 0;
    if (!t || !w || !l) return;
    const area = w * l;
    const massPerSheet = density * t * area;
    const totalMass = massPerSheet * q;
    const cost = (totalMass / 1000) * ppt;
    setResult({ massPerSheet, totalMass, cost, area });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Inputs */}
      <Card>
        <CardHeader><CardTitle className="text-base">Параметры</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Материал</Label>
            <Select value={materialId} onValueChange={handleMaterialChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATERIALS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasDensityOptions && (
            <div className="space-y-2">
              <Label>Марка / плотность</Label>
              <Select
                value={String(density)}
                onValueChange={v => { setDensity(Number(v)); setResult(null); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DENSITY_OPTIONS[materialId].map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Толщина, мм</Label>
              <Input
                type="number" min="0" step="0.1"
                value={thickness}
                onChange={e => { setThickness(e.target.value); setResult(null); }}
                placeholder="напр. 4"
              />
            </div>
            <div className="space-y-2">
              <Label>Кол-во листов</Label>
              <Input
                type="number" min="1"
                value={quantity}
                onChange={e => { setQuantity(e.target.value); setResult(null); }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ширина, мм</Label>
              <Input
                type="number" min="0"
                value={width}
                onChange={e => { setWidth(e.target.value); setResult(null); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Длина, мм</Label>
              <Input
                type="number" min="0"
                value={length}
                onChange={e => { setLength(e.target.value); setResult(null); }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Цена за тонну, ₽</Label>
            <Input
              type="number" min="0"
              value={pricePerTon}
              onChange={e => { setPricePerTon(e.target.value); setResult(null); }}
            />
          </div>

          <div className="pt-1 text-xs text-slate-400">
            Плотность: {density.toLocaleString("ru-RU")} кг/м³
          </div>

          <Button className="w-full" onClick={calculate}>Рассчитать</Button>
        </CardContent>
      </Card>

      {/* Result */}
      <Card>
        <CardHeader><CardTitle className="text-base">Результат</CardTitle></CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
              Заполните параметры и нажмите «Рассчитать»
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <ResultRow label="Материал" value={material.label} />
                <ResultRow label="Площадь листа" value={`${formatNum(result.area)} м²`} />
                <ResultRow label="Масса 1 листа" value={`${formatNum(result.massPerSheet)} кг`} />
                <ResultRow
                  label={`Масса (${quantity} шт)`}
                  value={`${formatNum(result.totalMass)} кг`}
                  highlight
                />
                <ResultRow
                  label={`Масса (${quantity} шт)`}
                  value={`${formatNum(result.totalMass / 1000, 4)} т`}
                />
              </div>
              {parseFloat(pricePerTon) > 0 && (
                <div className="rounded-xl bg-slate-800 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Стоимость материала</span>
                    <span className="text-xl font-bold text-white">{formatCur(result.cost)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Таб: Резка ──────────────────────────────────────────────────────────────
function CuttingCalculator() {
  const [cutType, setCutType] = useState("laser");
  const [cutLength, setCutLength] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [costPerMeter, setCostPerMeter] = useState("40");
  const [result, setResult] = useState<{ totalLength: number; totalCost: number } | null>(null);

  function calculate() {
    const l = parseFloat(cutLength) || 0;
    const q = parseInt(quantity) || 1;
    const cpm = parseFloat(costPerMeter) || 0;
    if (!l) return;
    const totalLength = (l / 1000) * q;
    const totalCost = totalLength * cpm;
    setResult({ totalLength, totalCost });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Параметры</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Тип резки</Label>
            <Select value={cutType} onValueChange={v => { setCutType(v); setResult(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CUT_TYPES.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Длина реза, мм</Label>
            <Input
              type="number" min="0"
              value={cutLength}
              onChange={e => { setCutLength(e.target.value); setResult(null); }}
              placeholder="напр. 5000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Кол-во деталей</Label>
              <Input
                type="number" min="1"
                value={quantity}
                onChange={e => { setQuantity(e.target.value); setResult(null); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Цена, ₽/м</Label>
              <Input
                type="number" min="0"
                value={costPerMeter}
                onChange={e => { setCostPerMeter(e.target.value); setResult(null); }}
              />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600">Ориентировочные тарифы лазер:</p>
            <p>0–10 м → 40 ₽/м</p>
            <p>11–100 м → 33 ₽/м</p>
            <p>101–500 м → 28 ₽/м</p>
            <p>500+ м → 25 ₽/м</p>
          </div>

          <Button className="w-full" onClick={calculate}>Рассчитать</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Результат</CardTitle></CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
              Заполните параметры и нажмите «Рассчитать»
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <ResultRow label="Тип резки" value={CUT_TYPES.find(t => t.id === cutType)?.label ?? cutType} />
                <ResultRow label="Длина реза (1 дет.)" value={`${formatNum(parseFloat(cutLength) / 1000)} м`} />
                <ResultRow label="Кол-во деталей" value={`${quantity} шт`} />
                <ResultRow label="Общая длина реза" value={`${formatNum(result.totalLength)} м`} highlight />
                <ResultRow label="Цена за метр" value={`${costPerMeter} ₽/м`} />
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Стоимость резки</span>
                  <span className="text-xl font-bold text-white">{formatCur(result.totalCost)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Таб: Гибка ──────────────────────────────────────────────────────────────
function BendingCalculator() {
  const [metal, setMetal] = useState("Сталь");
  const [thickness, setThickness] = useState("");
  const [bendCount, setBendCount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pricePerBend, setPricePerBend] = useState("50");
  const [result, setResult] = useState<{ costPerPart: number; totalCost: number } | null>(null);

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
        <CardHeader><CardTitle className="text-base">Параметры</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Материал</Label>
            <Select value={metal} onValueChange={v => { setMetal(v); setResult(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BENDING_METALS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Толщина, мм</Label>
            <Input
              type="number" min="0" step="0.1"
              value={thickness}
              onChange={e => { setThickness(e.target.value); setResult(null); }}
              placeholder="напр. 2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Кол-во гибов (1 дет.)</Label>
              <Input
                type="number" min="0"
                value={bendCount}
                onChange={e => { setBendCount(e.target.value); setResult(null); }}
                placeholder="напр. 4"
              />
            </div>
            <div className="space-y-2">
              <Label>Кол-во деталей</Label>
              <Input
                type="number" min="1"
                value={quantity}
                onChange={e => { setQuantity(e.target.value); setResult(null); }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Цена за гиб, ₽</Label>
            <Input
              type="number" min="0"
              value={pricePerBend}
              onChange={e => { setPricePerBend(e.target.value); setResult(null); }}
            />
          </div>

          <Button className="w-full" onClick={calculate}>Рассчитать</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Результат</CardTitle></CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
              Заполните параметры и нажмите «Рассчитать»
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <ResultRow label="Материал" value={metal} />
                {thickness && <ResultRow label="Толщина" value={`${thickness} мм`} />}
                <ResultRow label="Гибов на деталь" value={`${bendCount} шт`} />
                <ResultRow label="Кол-во деталей" value={`${quantity} шт`} />
                <ResultRow label="Стоимость 1 детали" value={formatCur(result.costPerPart)} highlight />
              </div>
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Итого за гибку</span>
                  <span className="text-xl font-bold text-white">{formatCur(result.totalCost)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Вспомогательный компонент строки результата ─────────────────────────────
function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={cn("text-sm font-medium", highlight ? "text-slate-900 font-semibold" : "text-slate-700")}>
        {value}
      </span>
    </div>
  );
}

// ─── Основная страница ────────────────────────────────────────────────────────
const TABS = [
  { id: "metal",   label: "Металл",  icon: Layers },
  { id: "cutting", label: "Резка",   icon: Scissors },
  { id: "bending", label: "Гибка",   icon: Calculator },
] as const;

type TabId = typeof TABS[number]["id"];

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<TabId>("metal");

  return (
    <div>
      <Header title="Калькулятор" />
      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "metal"   && <MetalCalculator />}
        {activeTab === "cutting" && <CuttingCalculator />}
        {activeTab === "bending" && <BendingCalculator />}
      </div>
    </div>
  );
}
