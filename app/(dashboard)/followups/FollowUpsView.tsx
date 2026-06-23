"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  FOLLOWUP_RESULT_LABELS, FOLLOWUP_RESULT_COLORS, formatDate,
} from "@/lib/utils";
import { Phone, Trash2, Clock, Check, ArrowRight } from "lucide-react";

type FollowUp = {
  id: string;
  dueDate: string;
  status: "PENDING" | "DONE" | "CANCELLED";
  result: string | null;
  note: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: { id: string; name: string } | null;
  request: { id: string; number: number; title: string } | null;
  client: { id: string; name: string; shortName: string | null; phone: string | null };
};

type Tab = "overdue" | "today" | "upcoming" | "history";
const RESULT_KEYS = ["REACHED", "NO_ANSWER", "CALL_BACK", "REFUSED", "AGREED"] as const;

export function FollowUpsView({
  currentUserId,
  overdue,
  today,
  upcoming,
  history,
}: {
  currentUserId: string;
  overdue: FollowUp[];
  today: FollowUp[];
  upcoming: FollowUp[];
  history: FollowUp[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(overdue.length > 0 ? "overdue" : "today");
  const [mineOnly, setMineOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filterMine = (list: FollowUp[]) =>
    mineOnly ? list.filter((f) => f.assignee?.id === currentUserId) : list;

  const lists: Record<Tab, FollowUp[]> = {
    overdue: filterMine(overdue),
    today: filterMine(today),
    upcoming: filterMine(upcoming),
    history: filterMine(history),
  };

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/followups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert("Не удалось сохранить"); return; }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/followups/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const tabs: { key: Tab; label: string; count: number; danger?: boolean }[] = [
    { key: "overdue", label: "Просрочено", count: lists.overdue.length, danger: true },
    { key: "today", label: "Сегодня", count: lists.today.length },
    { key: "upcoming", label: "Предстоящие", count: lists.upcoming.length },
    { key: "history", label: "История", count: lists.history.length },
  ];

  const current = lists[tab];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-orange-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    tab === t.key
                      ? "bg-white/25 text-white"
                      : t.danger
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => setMineOnly(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Только мои
        </label>
      </div>

      {current.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Phone className="mx-auto mb-2 h-6 w-6 text-slate-300" />
          <p className="text-sm text-slate-500">
            {tab === "overdue" ? "Просроченных звонков нет — отлично!" : "Пусто"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {current.map((f) => {
            const clientName = f.client.shortName || f.client.name;
            const isHistory = f.status !== "PENDING";
            return (
              <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/clients/${f.client.id}`}
                        className="font-medium text-slate-900 hover:text-orange-600 transition-colors"
                      >
                        {clientName}
                      </Link>
                      {f.client.phone && (
                        <a href={`tel:${f.client.phone}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-orange-600">
                          <Phone className="h-3.5 w-3.5" /> {f.client.phone}
                        </a>
                      )}
                      {f.result && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${FOLLOWUP_RESULT_COLORS[f.result]}`}>
                          {FOLLOWUP_RESULT_LABELS[f.result]}
                        </span>
                      )}
                      {f.status === "CANCELLED" && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Отменено</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {isHistory
                        ? `выполнено ${formatDate(f.completedAt ?? f.createdAt)}`
                        : formatDate(f.dueDate)}
                      {f.assignee && <span>· {f.assignee.name}</span>}
                      {f.request && (
                        <Link href={`/requests/${f.request.id}`} className="hover:text-orange-600">
                          · заявка #{f.request.number}
                        </Link>
                      )}
                    </div>
                    {f.note && <p className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap">{f.note}</p>}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/clients/${f.client.id}`}
                      className="rounded p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                      title="Открыть контрагента"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(f.id)}
                      disabled={busyId === f.id}
                      className="rounded p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {!isHistory && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Check className="h-3.5 w-3.5" /> Отметить звонок:
                    </span>
                    {RESULT_KEYS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => patch(f.id, { status: "DONE", result: r })}
                        disabled={busyId === f.id}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40 ${FOLLOWUP_RESULT_COLORS[r]}`}
                      >
                        {FOLLOWUP_RESULT_LABELS[r]}
                      </button>
                    ))}
                    <label className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400">
                      Перенести:
                      <Input
                        type="date"
                        onChange={(e) => { if (e.target.value) patch(f.id, { dueDate: e.target.value }); }}
                        className="h-7 w-36 text-xs"
                        disabled={busyId === f.id}
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
