"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Check, Play, Pause, AlertTriangle, Calendar, Building2 } from "lucide-react";
import { TASK_STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, formatDate } from "@/lib/utils";

const TABS: { key: "active" | "done"; label: string }[] = [
  { key: "active", label: "В работе" },
  { key: "done",   label: "Готово" },
];

function isOverdue(item: any) {
  if (!item.dueDate || item.status === "DONE") return false;
  const due = new Date(item.dueDate);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

export default function OperatorPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/operator/subtasks");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateStatus = async (item: any, newStatus: string) => {
    setUpdatingId(item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i));
    try {
      const res = await fetch(`/api/tasks/${item.taskId}/subtasks/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: item.status } : i));
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = items.filter((i) =>
    tab === "active"
      ? i.status === "TODO" || i.status === "IN_PROGRESS" || i.status === "PENDING_APPROVAL"
      : i.status === "DONE" || i.status === "CANCELLED"
  );

  const activeCount = items.filter((i) => i.status !== "DONE" && i.status !== "CANCELLED").length;
  const doneCount = items.length - activeCount;

  return (
    <div>
      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-10">
        <div className="grid grid-cols-2">
          {TABS.map((t) => {
            const count = t.key === "active" ? activeCount : doneCount;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative py-3 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "text-orange-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {count}
                  </span>
                )}
                {tab === t.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-slate-400 text-sm">
            <Check className="h-10 w-10 mb-2 text-slate-300" />
            {tab === "active" ? "Нет активных задач" : "Пока ничего не выполнено"}
          </div>
        ) : (
          filtered.map((item) => {
            const overdue = isOverdue(item);
            const isUpdating = updatingId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  overdue ? "border-red-200" : "border-slate-200"
                }`}
              >
                <Link href={`/tasks/${item.taskId}`} className="block">
                  <p className="text-xs font-medium text-slate-400 mb-1">
                    {item.task?.title}
                    {item.task?.client && <> · {item.task.client.shortName || item.task.client.name}</>}
                  </p>
                  <h3 className="text-base font-semibold text-slate-900 leading-tight">
                    {item.title}
                    {item.quantity != null && (
                      <span className="ml-1 font-normal text-slate-500">
                        {item.quantity} {item.unit || "шт"}
                      </span>
                    )}
                  </h3>
                </Link>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_COLORS[item.priority]}`}>
                    {PRIORITY_LABELS[item.priority]}
                  </span>
                  {item.task?.workshop && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Building2 className="h-3 w-3" /> {item.task.workshop.name}
                    </span>
                  )}
                  {item.dueDate && (
                    <span className={`inline-flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : "text-slate-500"}`}>
                      {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                      {formatDate(item.dueDate)}{overdue && " · просрочено"}
                    </span>
                  )}
                  <span className="ml-auto text-slate-400">
                    {TASK_STATUS_LABELS[item.status]}
                  </span>
                </div>

                {/* Большие touch-кнопки */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {item.status !== "IN_PROGRESS" && item.status !== "DONE" && (
                    <button
                      onClick={() => updateStatus(item, "IN_PROGRESS")}
                      disabled={isUpdating}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 col-span-2"
                    >
                      <Play className="h-4 w-4" /> Взять в работу
                    </button>
                  )}
                  {item.status === "IN_PROGRESS" && (
                    <>
                      <button
                        onClick={() => updateStatus(item, "TODO")}
                        disabled={isUpdating}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
                      >
                        <Pause className="h-4 w-4" /> Пауза
                      </button>
                      <button
                        onClick={() => updateStatus(item, "DONE")}
                        disabled={isUpdating}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" /> Готово
                      </button>
                    </>
                  )}
                  {item.status === "DONE" && (
                    <button
                      onClick={() => updateStatus(item, "IN_PROGRESS")}
                      disabled={isUpdating}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 col-span-2"
                    >
                      Вернуть в работу
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
