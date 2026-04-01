"use client";
import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Calculator, Scissors, Layers, Info, AlertTriangle, CheckCircle2, History, Trash2, ChevronDown, Zap, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  findMetalEntry,
  getThicknessesForMaterial,
  getSizesForMaterial,
} from "@/lib/metalReferenceData";

// ─── Типы материалов ────────────────────────────────────────────────────────
const MATERIALS = [
  { id: "hot-rolled",  label: "Сталь горячекатаная",  shortName: "ГК",    description: "Расчёт по справочнику (ГОСТ)",  density: 7850 },
  { id: "cold-rolled", label: "Сталь холоднокатаная",  shortName: "ХК",    description: "Плотность 7850 кг/м³",           density: 7850 },
  { id: "galvanized",  label: "Оцинкованный лист",     shortName: "ОЦИНК", description: "Масса покрытия не учтена",        density: 7850 },
  { id: "stainless",   label: "Нержавеющая сталь",     shortName: "НЕРЖ",  description: "Выбор марки стали",               density: 7930 },
  { id: "aluminum",    label: "Алюминий",               shortName: "АЛ",    description: "Выбор марки сплава",              density: 2700 },
  { id: "copper",      label: "Медь",                   shortName: "Cu",    description: "Плотность 8960 кг/м³",            density: 8960 },
  { id: "brass",       label: "Латунь",                 shortName: "ЛС",    description: "Плотность 8500 кг/м³",            density: 8500 },
  { id: "titanium",    label: "Титан",                  shortName: "Ti",    description: "Плотность 4510 кг/м³",            density: 4510 },
  { id: "zinc",        label: "Цинк",                   shortName: "Zn",    description: "Плотность 7140 кг/м³",            density: 7140 },
];

const DENSITY_OPTIONS: Record<string, { label: string; value: number }[]> = {
  stainless: [
    { label: "По умолчанию (7930 кг/м³)", value: 7930 },
    { label: "AISI 304 (7930 кг/м³)", value: 7930 },
    { label: "AISI 316 (8000 кг/м³)", value: 8000 },
    { label: "AISI 430 (7700 кг/м³)", value: 7700 },
  ],
  aluminum: [
    { label: "По умолчанию (2700 кг/м³)", value: 2700 },
    { label: "1050 / 1060 (2700 кг/м³)", value: 2700 },
    { label: "5083 (2650 кг/м³)", value: 2650 },
    { label: "6061 / 6082 (2700 кг/м³)", value: 2700 },
    { label: "7075 (2810 кг/м³)", value: 2810 },
  ],
};

const HISTORY_KEY = "metalcrm-calc-history";

interface HistoryEntry {
  id: string;
  ts: number;
  materialLabel: string;
  thickness: number;
  width: number;
  length: number;
  quantity: number;
  pricePerTon: number;
  markupType: "percent" | "fixed";
  markupValue: number;
  massPerSheet: number;
  totalMass: number;
  cost: number;
  costWithMarkup: number;
}

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

// ─── Диалог выбора режима ─────────────────────────────────────────────────────
type CalcMode = "quick" | "counterparty";

function CalculatorModeDialog({ open, onSelect }: { open: boolean; onSelect: (mode: CalcMode) => void }) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Калькулятор металла</DialogTitle>
          <DialogDescription className="text-center">Выберите режим расчёта</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <div
            className="group relative cursor-pointer rounded-xl border-2 border-slate-200 p-5 transition-all hover:border-orange-400 hover:bg-orange-50"
            onClick={() => onSelect("quick")}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md transition-transform group-hover:scale-110">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 group-hover:text-orange-600">Быстрый расчёт</p>
                <p className="mt-0.5 text-sm text-slate-500">Простой расчёт без привязки к клиенту</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />Мгновенный результат</li>
                  <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />Сохраняется в историю</li>
                </ul>
              </div>
            </div>
          </div>

          <div
            className="group relative cursor-pointer rounded-xl border-2 border-slate-200 p-5 transition-all hover:border-blue-400 hover:bg-blue-50"
            onClick={() => onSelect("counterparty")}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md transition-transform group-hover:scale-110">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 group-hover:text-blue-600">Расчёт с контрагентом</p>
                <p className="mt-0.5 text-sm text-slate-500">Расчёт с привязкой к клиенту</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Скидка клиента</li>
                  <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Привязка к заявке</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Таб: Металл ─────────────────────────────────────────────────────────────
function MetalCalculator({ mode }: { mode: CalcMode }) {
  const initThicknesses = useMemo(() => getThicknessesForMaterial("hot-rolled"), []);
  const initThickness   = initThicknesses[0] ?? 0;
  const initSizes       = useMemo(() => getSizesForMaterial("hot-rolled", initThickness), [initThickness]);
  const initSize        = initSizes[0] ?? { width: 1500, length: 6000 };

  const [materialId,     setMaterialId]     = useState("hot-rolled");
  const [density,        setDensity]        = useState(7850);
  const [thickness,      setThickness]      = useState(initThickness);
  const [width,          setWidth]          = useState(initSize.width);
  const [length,         setLength]         = useState(initSize.length);
  const [useCustomSize,  setUseCustomSize]  = useState(false);
  const [quantity,       setQuantity]       = useState("1");
  const [pricePerTon,    setPricePerTon]    = useState("78000");
  const [markupType,     setMarkupType]     = useState<"percent" | "fixed">("percent");
  const [markupValue,    setMarkupValue]    = useState("");
  const [weightMode,      setWeightMode]      = useState<"auto" | "invoice" | "formula">("auto");
  const [invoiceMass,     setInvoiceMass]     = useState("");
  const [invoiceMassEdited, setInvoiceMassEdited] = useState(false);
  const [vatEnabled,     setVatEnabled]     = useState(false);
  const [clientQuery,    setClientQuery]    = useState("");
  const [clientResults,  setClientResults]  = useState<{ id: string; name: string; discount?: number | null }[]>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; discount?: number | null } | null>(null);
  const [clientLoading,  setClientLoading]  = useState(false);
  const [result, setResult] = useState<{
    massPerSheet: number; totalMass: number; cost: number;
    costWithMarkup: number; markupAmount: number;
    vatAmount: number; costWithVat: number;
    area: number; massPerSqM: number;
    fromTable: boolean; warning?: string;
    refMass?: number; weightMode: "auto" | "invoice" | "formula";
  } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const material        = MATERIALS.find(m => m.id === materialId)!;
  const hasDensityOpts  = !!DENSITY_OPTIONS[materialId];
  const tableThicknesses = useMemo(() => getThicknessesForMaterial(materialId), [materialId]);
  const tableSizes       = useMemo(
    () => thickness > 0 ? getSizesForMaterial(materialId, thickness) : [],
    [materialId, thickness],
  );
  const displaySizes = tableSizes.length > 0 ? tableSizes : [
    { width: 1000, length: 2000 }, { width: 1250, length: 2500 },
    { width: 1500, length: 3000 }, { width: 1500, length: 6000 },
    { width: 2000, length: 6000 },
  ];

  // Запись из справочника для текущего выбора
  const refEntry = useMemo(
    () => findMetalEntry(materialId, thickness, width, length),
    [materialId, thickness, width, length],
  );

  // Автозаполнение массы из справочника в режиме "из накладной"
  useEffect(() => {
    if (weightMode === "invoice" && !invoiceMassEdited && refEntry) {
      setInvoiceMass(String(refEntry.sheetMass));
    }
  }, [refEntry, weightMode, invoiceMassEdited]);

  useEffect(() => {
    if (mode !== "counterparty" || clientQuery.length < 2) { setClientResults([]); return; }
    setClientLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/clients?search=${encodeURIComponent(clientQuery)}&limit=5`)
        .then(r => r.json())
        .then(data => setClientResults(Array.isArray(data) ? data : data.clients ?? []))
        .catch(() => {})
        .finally(() => setClientLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery, mode]);

  function handleMaterialChange(id: string) {
    setMaterialId(id);
    const mat = MATERIALS.find(m => m.id === id)!;
    setDensity(mat.density);
    const thicknesses = getThicknessesForMaterial(id);
    const t = thicknesses[0] ?? 0;
    setThickness(t);
    if (t > 0) {
      const sizes = getSizesForMaterial(id, t);
      if (sizes[0]) { setWidth(sizes[0].width); setLength(sizes[0].length); }
    }
    setInvoiceMassEdited(false);
    setResult(null);
  }

  function handleThicknessChange(val: number) {
    setThickness(val);
    if (!useCustomSize) {
      const sizes = getSizesForMaterial(materialId, val);
      if (sizes[0]) { setWidth(sizes[0].width); setLength(sizes[0].length); }
    }
    setInvoiceMassEdited(false);
    setResult(null);
  }

  function handleWeightModeChange(m: "auto" | "invoice" | "formula") {
    setWeightMode(m);
    setInvoiceMassEdited(false);
    if (m === "invoice" && refEntry) setInvoiceMass(String(refEntry.sheetMass));
    else if (m === "invoice") setInvoiceMass("");
    setResult(null);
  }

  function saveToHistory(entry: HistoryEntry) {
    const next = [entry, ...history].slice(0, 50);
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  }

  function removeFromHistory(id: string) {
    const next = history.filter(h => h.id !== id);
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  }

  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
  }

  function loadFromHistory(h: HistoryEntry) {
    const mat = MATERIALS.find(m => m.label === h.materialLabel);
    if (mat) { setMaterialId(mat.id); setDensity(mat.density); }
    setThickness(h.thickness);
    setWidth(h.width);
    setLength(h.length);
    setQuantity(String(h.quantity));
    setPricePerTon(String(h.pricePerTon));
    setMarkupType(h.markupType);
    setMarkupValue(h.markupValue > 0 ? String(h.markupValue) : "");
    setShowHistory(false);
    setResult(null);
  }

  function calculate() {
    const w   = width / 1000;
    const l   = length / 1000;
    const q   = parseInt(quantity) || 1;
    const ppt = parseFloat(pricePerTon) || 0;
    if (!w || !l || !ppt) return;

    const area = w * l;
    let massPerSheet: number;
    let fromTable = false;
    let warning: string | undefined;
    const refMass = refEntry?.sheetMass;

    if (weightMode === "invoice") {
      massPerSheet = parseFloat(invoiceMass) || 0;
      if (!massPerSheet) return;
      fromTable = !invoiceMassEdited && !!refEntry;
    } else if (weightMode === "formula") {
      if (!thickness) return;
      massPerSheet = density * (thickness / 1000) * area;
    } else {
      // auto — из справочника, при отсутствии — формула
      if (refEntry) {
        massPerSheet = refEntry.sheetMass;
        fromTable = true;
      } else {
        if (!thickness) return;
        massPerSheet = density * (thickness / 1000) * area;
        warning = "Нестандартный размер — расчёт по формуле";
      }
    }

    const totalMass    = massPerSheet * q;
    const cost         = (totalMass / 1000) * ppt;
    const clientDiscount = (mode === "counterparty" && selectedClient?.discount) ? selectedClient.discount : 0;
    const mv           = parseFloat(markupValue) || 0;
    const markupAmount = mv > 0
      ? (markupType === "percent" ? cost * (mv / 100) : mv)
      : clientDiscount > 0 ? -(cost * (clientDiscount / 100)) : 0;
    const costWithMarkup = cost + markupAmount;
    const vatAmount    = vatEnabled ? costWithMarkup * 0.22 : 0;
    const costWithVat  = costWithMarkup + vatAmount;
    const massPerSqM   = massPerSheet / area;

    setResult({ massPerSheet, totalMass, cost, costWithMarkup, markupAmount, vatAmount, costWithVat, area, massPerSqM, fromTable, warning, refMass, weightMode });

    saveToHistory({
      id: `h-${Date.now()}`,
      ts: Date.now(),
      materialLabel: material.label,
      thickness, width, length, quantity: q,
      pricePerTon: ppt, markupType, markupValue: mv,
      massPerSheet, totalMass, cost, costWithMarkup,
    });
  }

  return (
    <div className="space-y-4">
      {/* ── Описание материала + история ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5 flex-1">
          <Info className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{material.description}</span>
          {weightMode === "auto" && refEntry && (
            <span className="ml-2 text-xs text-green-600 font-medium">· справочник ГОСТ</span>
          )}
          {weightMode === "invoice" && (
            <span className="ml-2 text-xs text-orange-600 font-medium">· вес из накладной</span>
          )}
          {weightMode === "formula" && (
            <span className="ml-2 text-xs text-blue-600 font-medium">· расчёт по плотности</span>
          )}
        </div>
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(v => !v)} className="gap-2">
            <History className="h-4 w-4" />
            История
            {history.length > 0 && (
              <span className="ml-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold px-1.5 py-0.5">
                {history.length}
              </span>
            )}
            <ChevronDown className={cn("h-3 w-3 transition-transform", showHistory && "rotate-180")} />
          </Button>
          {showHistory && (
            <div className="absolute right-0 top-full mt-1 z-50 w-96 rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">История расчётов</p>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                    Очистить всё
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-6">Нет записей</p>
                ) : (
                  history.map(h => (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <button onClick={() => loadFromHistory(h)} className="flex-1 text-left">
                        <p className="text-xs font-medium text-slate-700 truncate">
                          {h.materialLabel} · {h.thickness} мм · {h.width}×{h.length}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {h.quantity} шт · {h.totalMass.toFixed(1)} кг · {h.costWithMarkup.toLocaleString("ru-RU")} ₽
                        </p>
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          {new Date(h.ts).toLocaleString("ru-RU", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}
                        </p>
                      </button>
                      <button onClick={() => removeFromHistory(h.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── Параметры ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Параметры</CardTitle></CardHeader>
        <CardContent className="space-y-4">

          {/* Контрагент */}
          {mode === "counterparty" && (
            <div className="space-y-1.5">
              <Label>Контрагент</Label>
              {selectedClient ? (
                <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-blue-800">{selectedClient.name}</p>
                    {selectedClient.discount ? (
                      <p className="text-xs text-blue-500">Скидка: {selectedClient.discount}% (применена автоматически)</p>
                    ) : null}
                  </div>
                  <button onClick={() => { setSelectedClient(null); setClientQuery(""); }} className="text-blue-400 hover:text-blue-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Поиск по названию..."
                    value={clientQuery}
                    onChange={e => setClientQuery(e.target.value)}
                  />
                  {clientLoading && (
                    <p className="absolute right-3 top-2.5 text-xs text-slate-400">Поиск...</p>
                  )}
                  {clientResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                      {clientResults.map(c => (
                        <button key={c.id} onClick={() => { setSelectedClient(c); setClientQuery(""); setClientResults([]); }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">{c.name}</span>
                          {c.discount ? <span className="ml-auto text-xs text-blue-500">−{c.discount}%</span> : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Материал */}
          <div className="space-y-1.5">
            <Label>Материал</Label>
            <Select value={materialId} onValueChange={handleMaterialChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-52 overflow-y-auto">
                {MATERIALS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Марка / плотность */}
          {hasDensityOpts && (
            <div className="space-y-1.5">
              <Label>Марка / плотность</Label>
              <Select value={String(density)} onValueChange={v => { setDensity(Number(v)); setResult(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DENSITY_OPTIONS[materialId].map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Режим расчёта веса */}
          <div className="space-y-1.5">
            <Label>Режим расчёта</Label>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
              {([
                { id: "auto",    label: "Справочник",  hint: "Авто из ГОСТ" },
                { id: "invoice", label: "Из накладной", hint: "Фактический вес" },
                { id: "formula", label: "По плотности", hint: "Ручной расчёт" },
              ] as const).map(m => (
                <button key={m.id} type="button"
                  onClick={() => handleWeightModeChange(m.id)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                    weightMode === m.id
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  )}
                  title={m.hint}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Толщина (не нужна в режиме накладной без размеров) */}
          {weightMode !== "invoice" && (
            <div className="space-y-1.5">
              <Label>Толщина, мм</Label>
              {tableThicknesses.length > 0 && weightMode !== "formula" ? (
                <Select value={String(thickness)} onValueChange={v => handleThicknessChange(parseFloat(v))}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-44 overflow-y-auto">
                    {tableThicknesses.map(t => (
                      <SelectItem key={t} value={String(t)} className="font-mono">{t} мм</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input type="number" min="0" step="0.1" value={thickness || ""}
                  onChange={e => { setThickness(parseFloat(e.target.value) || 0); setResult(null); }}
                  placeholder="напр. 4" className="w-36" />
              )}
            </div>
          )}
          {weightMode === "invoice" && (
            <div className="space-y-1.5">
              <Label>Толщина, мм</Label>
              {tableThicknesses.length > 0 ? (
                <Select value={String(thickness)} onValueChange={v => handleThicknessChange(parseFloat(v))}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-44 overflow-y-auto">
                    {tableThicknesses.map(t => (
                      <SelectItem key={t} value={String(t)} className="font-mono">{t} мм</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input type="number" min="0" step="0.1" value={thickness || ""}
                  onChange={e => { setThickness(parseFloat(e.target.value) || 0); setResult(null); }}
                  placeholder="напр. 4" className="w-36" />
              )}
            </div>
          )}

          {/* Поле массы в режиме "из накладной" */}
          {weightMode === "invoice" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Масса листа, кг</Label>
                {!invoiceMassEdited && refEntry ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> из справочника
                  </span>
                ) : invoiceMassEdited && refEntry ? (
                  <button
                    type="button"
                    onClick={() => { setInvoiceMassEdited(false); setInvoiceMass(String(refEntry.sheetMass)); setResult(null); }}
                    className="text-[10px] text-orange-500 hover:text-orange-700 transition-colors"
                  >
                    Сбросить к справочнику ({refEntry.sheetMass} кг)
                  </button>
                ) : null}
              </div>
              <Input
                type="number" min="0" step="0.01"
                value={invoiceMass}
                onChange={e => { setInvoiceMass(e.target.value); setInvoiceMassEdited(true); setResult(null); }}
                placeholder="напр. 36.8"
                className={cn(!invoiceMassEdited && refEntry ? "border-green-200 bg-green-50" : "")}
              />
              {!refEntry && thickness > 0 && (
                <p className="text-[11px] text-slate-400">Размер не найден в справочнике — введите фактический вес</p>
              )}
            </div>
          )}

          {/* Размер листа */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Размер листа</Label>
              <div className="flex items-center gap-2">
                <Switch id="custom-size" checked={useCustomSize}
                  onCheckedChange={v => { setUseCustomSize(v); setResult(null); }} />
                <Label htmlFor="custom-size" className="text-xs text-slate-500 cursor-pointer">Свой</Label>
              </div>
            </div>
            {!useCustomSize && (
              <div className="flex flex-wrap gap-1.5">
                {displaySizes.map(sz => (
                  <button key={`${sz.width}x${sz.length}`} type="button"
                    onClick={() => { setWidth(sz.width); setLength(sz.length); setResult(null); }}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-mono font-medium border transition-all",
                      sz.width === width && sz.length === length
                        ? "bg-orange-600 text-white border-orange-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    )}>
                    {sz.width}×{sz.length}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Ширина, мм</Label>
                <Input type="number" min="0" value={width}
                  onChange={e => { setWidth(parseInt(e.target.value) || 0); setResult(null); }}
                  readOnly={!useCustomSize}
                  className={!useCustomSize ? "bg-slate-50 text-slate-500" : ""} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Длина, мм</Label>
                <Input type="number" min="0" value={length}
                  onChange={e => { setLength(parseInt(e.target.value) || 0); setResult(null); }}
                  readOnly={!useCustomSize}
                  className={!useCustomSize ? "bg-slate-50 text-slate-500" : ""} />
              </div>
            </div>
          </div>

          {/* Кол-во и цена */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Кол-во листов</Label>
              <Input type="number" min="1" value={quantity}
                onChange={e => { setQuantity(e.target.value); setResult(null); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Цена за тонну, ₽</Label>
              <Input type="number" min="0" value={pricePerTon}
                onChange={e => { setPricePerTon(e.target.value); setResult(null); }} />
            </div>
          </div>

          {/* Наценка */}
          <div className="space-y-1.5">
            <Label>Наценка</Label>
            <div className="flex gap-2">
              <Input type="number" min="0" value={markupValue} placeholder="0"
                onChange={e => { setMarkupValue(e.target.value); setResult(null); }}
                className="flex-1" />
              <Select value={markupType} onValueChange={(v: "percent" | "fixed") => { setMarkupType(v); setResult(null); }}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">%</SelectItem>
                  <SelectItem value="fixed">₽</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* НДС */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-700">НДС 20%</p>
              <p className="text-[11px] text-slate-400">Добавить к итоговой стоимости</p>
            </div>
            <Switch id="vat" checked={vatEnabled}
              onCheckedChange={v => { setVatEnabled(v); setResult(null); }} />
          </div>

          <Button className="w-full" onClick={calculate}>Рассчитать</Button>
        </CardContent>
      </Card>

      {/* ── Результат ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Результат</CardTitle></CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
              Заполните параметры и нажмите «Рассчитать»
            </div>
          ) : (
            <div className="space-y-3">
              {result.weightMode === "invoice" && result.fromTable && !invoiceMassEdited ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Вес из справочника ГОСТ — применён как фактический
                </div>
              ) : result.weightMode === "invoice" ? (
                <div className="flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Фактический вес из накладной: {invoiceMass} кг
                  {result.refMass ? ` (справочник: ${result.refMass} кг)` : ""}
                </div>
              ) : result.weightMode === "formula" ? (
                <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Расчёт по плотности {density} кг/м³
                  {result.refMass ? ` · Справочник: ${result.refMass} кг` : ""}
                </div>
              ) : result.fromTable ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Расчёт по справочнику ГОСТ — точный вес
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {result.warning}
                </div>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <ResultRow label="Материал"       value={material.label} />
                <ResultRow label="Размер"          value={`${width}×${length} мм`} />
                <ResultRow label="Толщина"         value={`${thickness} мм`} />
                <ResultRow label="Площадь листа"   value={`${formatNum(result.area)} м²`} />
                <ResultRow label="Масса 1 листа"   value={`${formatNum(result.massPerSheet)} кг`} highlight />
                {result.refMass !== undefined && result.refMass !== result.massPerSheet && (
                  <ResultRow label="По справочнику" value={`${formatNum(result.refMass)} кг`} />
                )}
                <ResultRow label="Удельный вес"    value={`${formatNum(result.massPerSqM)} кг/м²`} />
                <ResultRow label={`Масса (${quantity} шт)`} value={`${formatNum(result.totalMass)} кг`} highlight />
                <ResultRow label="В тоннах"        value={`${formatNum(result.totalMass / 1000, 4)} т`} />
              </div>

              <div className="rounded-xl bg-slate-800 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Стоимость</span>
                  <span className="text-sm text-slate-300">{formatCur(result.cost)}</span>
                </div>
                {result.markupAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      Наценка ({markupValue}{markupType === "percent" ? "%" : " ₽"})
                    </span>
                    <span className="text-sm text-orange-400">+{formatCur(result.markupAmount)}</span>
                  </div>
                )}
                {result.vatAmount > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Без НДС</span>
                      <span className="text-sm text-slate-300">{formatCur(result.costWithMarkup)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">НДС 20%</span>
                      <span className="text-sm text-blue-400">+{formatCur(result.vatAmount)}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-slate-700 pt-2 flex items-center justify-between">
                  <span className="text-sm text-slate-200 font-medium">
                    Итого {result.vatAmount > 0 ? "с НДС" : ""}
                  </span>
                  <span className="text-xl font-bold text-white">{formatCur(result.costWithVat)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

// ─── Таб: Резка ──────────────────────────────────────────────────────────────
const CUTTING_MATERIAL_OPTIONS = [
  { id: "hot-rolled",  label: "Г/К сталь" },
  { id: "cold-rolled", label: "Х/К сталь" },
  { id: "galvanized",  label: "Оцинковка" },
  { id: "stainless",   label: "Нержавейка" },
  { id: "aluminum",    label: "Алюминий" },
];

function CuttingCalculator() {
  const [cutType, setCutType] = useState("laser");
  const [metalType, setMetalType] = useState("hot-rolled");
  const [thickness, setThickness] = useState("");
  const [cutLength, setCutLength] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [costPerMeter, setCostPerMeter] = useState("");
  const [result, setResult] = useState<{ totalLength: number; totalCost: number } | null>(null);
  const [catalogEntries, setCatalogEntries] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/catalog/cutting").then(r => r.ok ? r.json() : []).then(setCatalogEntries);
  }, []);

  // Thicknesses available in DB for selected material
  const availableThicknesses = Array.from(
    new Set(catalogEntries.filter(e => e.materialId === metalType).map(e => e.thickness))
  ).sort((a, b) => a - b);

  // Suggest price from DB based on metal, thickness, and total cut length (in meters)
  const totalLengthM = (parseFloat(cutLength) || 0) / 1000 * (parseInt(quantity) || 1);

  const suggestedPrice = useMemo(() => {
    const t = parseFloat(thickness);
    if (!t || !totalLengthM) return null;
    const entries = catalogEntries
      .filter(e => e.materialId === metalType && e.thickness === t)
      .sort((a: any, b: any) => a.minLength - b.minLength);
    if (entries.length === 0) return null;
    for (const e of entries) {
      if (totalLengthM >= e.minLength && (e.maxLength == null || totalLengthM <= e.maxLength)) {
        return e.pricePerMeter as number;
      }
    }
    // Use last range if beyond all defined
    return entries[entries.length - 1].pricePerMeter as number;
  }, [catalogEntries, metalType, thickness, totalLengthM]);

  const hasDbData = availableThicknesses.length > 0;

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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Вид металла</Label>
              <Select value={metalType} onValueChange={v => { setMetalType(v); setThickness(""); setResult(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUTTING_MATERIAL_OPTIONS.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Толщина, мм</Label>
              {hasDbData ? (
                <Select value={thickness} onValueChange={v => { setThickness(v); setResult(null); }}>
                  <SelectTrigger><SelectValue placeholder="Выбрать" /></SelectTrigger>
                  <SelectContent>
                    {availableThicknesses.map(t => (
                      <SelectItem key={t} value={String(t)}>{t} мм</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number" min="0.1" step="0.1"
                  value={thickness}
                  onChange={e => { setThickness(e.target.value); setResult(null); }}
                  placeholder="напр. 3"
                />
              )}
            </div>
          </div>

          {!hasDbData && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Справочник цен резки пуст. Заполните его в <span className="font-medium">Настройки → Резка</span>.
            </div>
          )}

          {suggestedPrice !== null && (
            <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-xs text-blue-700">
                По справочнику для {formatNum(totalLengthM)} м: <span className="font-bold">{suggestedPrice} ₽/м</span>
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
                placeholder="₽/м"
              />
            </div>
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
                <ResultRow label="Вид металла" value={CUTTING_MATERIAL_OPTIONS.find(m => m.id === metalType)?.label ?? metalType} />
                {thickness && <ResultRow label="Толщина" value={`${thickness} мм`} />}
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
  const [mode, setMode] = useState<CalcMode>("quick");

  return (
    <div>
      <Header title="Калькулятор" />
      <div className="p-6 space-y-6">
        {/* Tabs + режим */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
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
          {mode && (
            <button
              onClick={() => setMode(mode === "counterparty" ? "quick" : "counterparty")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                mode === "counterparty"
                  ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {mode === "counterparty" ? <Users className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
              {mode === "counterparty" ? "С контрагентом" : "Быстрый расчёт"}
              <span className="text-slate-400">· сменить</span>
            </button>
          )}
        </div>

        {activeTab === "metal"   && <MetalCalculator mode={mode ?? "quick"} />}
        {activeTab === "cutting" && <CuttingCalculator />}
        {activeTab === "bending" && <BendingCalculator />}
      </div>
    </div>
  );
}
