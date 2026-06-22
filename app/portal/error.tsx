"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

// Error boundary для клиентского портала (ЛК). Показывает понятный экран
// клиенту вместо дефолтного белого «Application error». reset() пере-рендерит
// сегмент, кнопка «Обновить» делает полную перезагрузку.
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[portal] segment error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
          <AlertTriangle className="h-6 w-6 text-orange-600" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Не удалось загрузить страницу</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Произошла ошибка. Попробуйте обновить страницу. Если проблема
          повторяется, свяжитесь с менеджером и сообщите код ошибки ниже.
        </p>
        {error.digest && (
          <p className="mt-3 inline-block rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-500">
            {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button onClick={reset} variant="outline">
            Попробовать снова
          </Button>
          <Button onClick={() => window.location.reload()}>
            <RotateCw className="mr-1.5 h-4 w-4" /> Обновить страницу
          </Button>
        </div>
      </div>
    </div>
  );
}
