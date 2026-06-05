"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  formatDate, formatCurrency,
} from "@/lib/utils";
import { Eye, Pencil, Trash2, Check, X, Lock } from "lucide-react";

type Request = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  paymentStatus: string;
  amount: number | null;
  lockedAt: string | null;
  createdAt: string | Date;
  assignee: { id: string; name: string } | null;
};

export function ClientRequestsList({
  clientId,
  initialRequests,
}: {
  clientId: string;
  initialRequests: Request[];
}) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canManage = role === "ADMIN" || role === "MANAGER";

  const [requests, setRequests] = useState(initialRequests);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  function startEdit(req: Request) {
    setEditingId(req.id);
    setEditTitle(req.title);
    setEditStatus(req.status);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(req: Request) {
    setSavingId(req.id);
    try {
      const patch: Record<string, string> = {};
      if (editTitle.trim() && editTitle !== req.title) patch.title = editTitle.trim();
      if (editStatus !== req.status) patch.status = editStatus;
      if (!Object.keys(patch).length) { cancelEdit(); return; }

      const res = await fetch(`/api/requests/${req.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setRequests((cur) => cur.map((r) => r.id === req.id ? { ...r, ...updated } : r));
      cancelEdit();
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRequest(id: string) {
    const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
    if (res.ok) setRequests((cur) => cur.filter((r) => r.id !== id));
  }

  if (requests.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-slate-300">Заявок нет</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {requests.map((req) => {
        const isLocked = Boolean(req.lockedAt) && role === "MANAGER";
        const isEditing = editingId === req.id;

        return (
          <div key={req.id} className="group px-5 py-3 hover:bg-slate-50 transition-colors">
            {isEditing ? (
              // ─── Режим редактирования ──────────────────────────────────────
              <div className="space-y-2">
                <Input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                  className="h-8 text-sm font-medium"
                  maxLength={500}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className={`h-7 w-40 text-xs rounded-full border-0 shadow-none px-2.5 font-medium ${REQUEST_STATUS_COLORS[editStatus]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1 ml-auto">
                    <Button size="sm" onClick={() => saveEdit(req)} disabled={savingId === req.id}>
                      <Check className="h-3.5 w-3.5 mr-1" /> {savingId === req.id ? "…" : "Сохранить"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={savingId === req.id}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // ─── Режим просмотра ───────────────────────────────────────────
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 font-mono text-xs">#{req.number}</span>
                    {isLocked && <Lock className="h-3 w-3 text-amber-500" title="Заблокировано (В работе)" />}
                    <span className="text-sm font-medium text-slate-800 truncate">{req.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${REQUEST_STATUS_COLORS[req.status]}`}>
                      {REQUEST_STATUS_LABELS[req.status]}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[req.priority]}`}>
                      {PRIORITY_LABELS[req.priority]}
                    </span>
                    {req.paymentStatus && req.paymentStatus !== "NONE" && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PAYMENT_STATUS_COLORS[req.paymentStatus]}`}>
                        {PAYMENT_STATUS_LABELS[req.paymentStatus]}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {req.assignee?.name ?? "Не назначен"} · {formatDate(req.createdAt)}
                    </span>
                    {req.amount && (
                      <span className="text-xs font-medium text-slate-600">
                        {formatCurrency(req.amount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Действия */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/requests/${req.id}`}>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Открыть">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {canManage && !isLocked && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Редактировать"
                      onClick={() => startEdit(req)}
                    >
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                  )}
                  {canManage && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600" title="Удалить">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить заявку #{req.number}?</AlertDialogTitle>
                          <AlertDialogDescription>Это действие необратимо.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteRequest(req.id)}
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
