"use client";
import { Zap, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { CalcMode } from "./_types";

/** Модальное окно выбора режима калькулятора (быстрый / с контрагентом). */
export function CalculatorModeDialog({
  open,
  onSelect,
}: {
  open: boolean;
  onSelect: (mode: CalcMode) => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Калькулятор металла
          </DialogTitle>
          <DialogDescription className="text-center">
            Выберите режим расчёта
          </DialogDescription>
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
                <p className="font-semibold text-slate-900 group-hover:text-orange-600">
                  Быстрый расчёт
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Простой расчёт без привязки к клиенту
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    Мгновенный результат
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    Сохраняется в историю
                  </li>
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
                <p className="font-semibold text-slate-900 group-hover:text-blue-600">
                  Расчёт с контрагентом
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Расчёт с привязкой к клиенту
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Скидка клиента
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Привязка к заявке
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
