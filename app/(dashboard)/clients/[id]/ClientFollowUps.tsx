"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CLIENT_RELATION_STATUS_LABELS, CLIENT_RELATION_STATUS_COLORS,
  FOLLOWUP_RESULT_LABELS, FOLLOWUP_RESULT_COLORS, formatDate,
} from "@/lib/utils";
import { Phone, Plus, Check, Trash2, Clock, CalendarClock } from "lucide-react";

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
};

type UserOpt = { id: string; name: string };

const RESULT_KEYS = ["REACHED", "NO_ANSWER", "CALL_BACK", "REFUSED", "AGREED"] as const;
const RELATION_KEYS = ["NEW", "IN_WORK", "THINKING", "WON", "LOST"] as const;

function todayStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function isOverdue(due: string) {
  const d = new Date(due);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return d < start;
}

export function ClientFollowUps({
  clientId,
  initialRelationStatus,
  initialFollowUps,
  users,
  currentUserId,
}: {
  clientId: string;
  initialRelationStatus: string;
  initialFollowUps: FollowUp[];
  users: UserOpt[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<FollowUp[]>(initialFollowUps);
  const [relationStatus, setRelationStatus] = useState(initialRelationStatus);

  // Форма нового напоминания.
  const [dueDate, setDueDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { active, history } = useMemo(() => {
    const a = items
      .filter((i) => i.status === "PENDING")
      .sort((x, y) => +new Date(x.dueDate) - +new Date(y.dueDate));
    const h = items
      .filter((i) => i.status !== "PENDING")
      .sort((x, y) => +new Date(y.completedAt ?? y.createdAt) - +new Date(x.completedAt ?? x.createdAt));
    return { active: a, history: h };
  }, [items]);

  async function changeRelation(next: string) {
    const prev = relationStatus;
    setRelationStatus(next);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relationStatus: next }),
    });
    if (!res.ok) { setRelationStatus(prev); alert("Не удалось сменить статус"); }
  }

  async function createFollowUp() {
    if (!dueDate) return;
    setCreating(true);
    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, dueDate, note: note.trim() || null, assigneeId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d?.error ?? "Не удалось создать напоминание");
        return;
      }
      const created = (await res.json()) as FollowUp;
      setItems((cur) => [created, ...cur]);
      setNote("");
      setDueDate(todayStr());
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/followups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert("Не удалось сохранить"); return; }
      const updated = (await res.json()) as FollowUp;
      setItems((cur) => cur.map((i) => (i.id === id ? updated : i)));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/followups/${id}`, { method: "DELETE" });
      if (res.ok) setItems((cur) => cur.filter((i) => i.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  function closeWithResult(id: string, result: string) {
    patch(id, { status: "DONE", result });
  }

  const relOpt = CLIENT_RELATION_STATUS_COLORS[relationStatus] ?? CLIENT_RELATION_STATUS_COLORS.NEW;

  return (
    <div className="space-y-4">
      {/* Статус отношений */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Статус:</span>
        <Select value={relationStatus} onValueChange={changeRelation}>
          <SelectTrigger className={`h-7 w-auto min-w-32 rounded-full border-0 px-3 text-xs font-medium shadow-none ${relOpt}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RELATION_KEYS.map((k) => (
              <SelectItem key={k} value={k} className="text-xs">
                {CLIENT_RELATION_STATUS_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Новая заявка-напоминание */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 w-40 text-sm"
            />
          </div>
          {users.length > 1 && (
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="О чём звонить (напр. «уточнить по КП», «перезвонить после праздников»)"
          className="text-sm bg-white"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={createFollowUp} disabled={creating || !dueDate}>
            <Plus className="mr-1 h-3.5 w-3.5" /> {creating ? "Добавление…" : "Запланировать звонок"}
          </Button>
        </div>
      </div>

      {/* Активные напоминания */}
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((f) => {
            const overdue = isOverdue(f.dueDate);
            return (
              <div
                key={f.id}
                className={`rounded-lg border p-3 ${overdue ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className={`h-3.5 w-3.5 ${overdue ? "text-rose-500" : "text-slate-400"}`} />
                      <span className={overdue ? "font-medium text-rose-600" : "text-slate-500"}>
                        {formatDate(f.dueDate)}{overdue ? " · просрочено" : ""}
                      </span>
                      {f.assignee && <span className="text-slate-400">· {f.assignee.name}</span>}
                    </div>
                    {f.note && <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{f.note}</p>}
                    {f.request && (
                      <p className="mt-0.5 text-xs text-slate-400">по заявке #{f.request.number}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    disabled={busyId === f.id}
                    className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {/* Закрыть со результатом звонка */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <Check className="h-3.5 w-3.5" /> Результат:
                  </span>
                  {RESULT_KEYS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => closeWithResult(f.id, r)}
                      disabled={busyId === f.id}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40 ${FOLLOWUP_RESULT_COLORS[r]}`}
                    >
                      {FOLLOWUP_RESULT_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {active.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Phone className="h-4 w-4" /> Активных напоминаний нет
        </p>
      )}

      {/* История звонков */}
      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">История</p>
          {history.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {formatDate(f.completedAt ?? f.createdAt)}
              </span>
              {f.result && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${FOLLOWUP_RESULT_COLORS[f.result]}`}>
                  {FOLLOWUP_RESULT_LABELS[f.result]}
                </span>
              )}
              {f.status === "CANCELLED" && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Отменено</span>
              )}
              {f.note && <span className="truncate text-slate-600">{f.note}</span>}
              <button
                type="button"
                onClick={() => remove(f.id)}
                disabled={busyId === f.id}
                className="ml-auto shrink-0 rounded p-1 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
                title="Удалить"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
