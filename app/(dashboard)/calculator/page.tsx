"use client";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { Calculator, Scissors, Layers, Zap, Users } from "lucide-react";
import type { CalcMode } from "./_types";
import { CalculatorModeDialog } from "./CalculatorModeDialog";
import { MetalCalculator } from "./MetalCalculator";
import { BendingCalculator } from "./BendingCalculator";
import { CuttingCalculator } from "./CuttingCalculator";

const TABS = [
  { id: "metal", label: "Металл", icon: Layers },
  { id: "cutting", label: "Резка", icon: Scissors },
  { id: "bending", label: "Гибка", icon: Calculator },
] as const;

type TabId = (typeof TABS)[number]["id"];

// До разбивки этот файл был на 1863 строки и содержал четыре калькулятора +
// модальное окно + константы внутри одной страницы. См. соседние файлы
// (MetalCalculator, BendingCalculator, CuttingCalculator, CalculatorModeDialog,
// ResultRow, _constants, _types, _utils) и docs/REMEDIATION.md, п.8.
export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<TabId>("metal");
  const [mode, setMode] = useState<CalcMode>("quick");

  return (
    <div>
      <Header title="Калькулятор" />
      <div className="p-4 lg:p-6 space-y-6">
        {/* Tabs + режим */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-0.5 rounded-xl bg-slate-100 p-1 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
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
              onClick={() =>
                setMode(mode === "counterparty" ? "quick" : "counterparty")
              }
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                mode === "counterparty"
                  ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
              )}
            >
              {mode === "counterparty" ? (
                <Users className="h-3.5 w-3.5" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {mode === "counterparty" ? "С контрагентом" : "Быстрый расчёт"}
              <span className="text-slate-400">· сменить</span>
            </button>
          )}
        </div>

        {activeTab === "metal" && <MetalCalculator mode={mode ?? "quick"} />}
        {activeTab === "cutting" && <CuttingCalculator />}
        {activeTab === "bending" && <BendingCalculator />}
      </div>
    </div>
  );
}

// Заглушка-импорт CalculatorModeDialog оставлен на будущее (диалог пока не
// используется в верхнеуровневом потоке, но был частью исходного компонента).
void CalculatorModeDialog;
