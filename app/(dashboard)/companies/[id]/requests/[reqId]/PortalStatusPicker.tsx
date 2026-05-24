"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Смена общего статуса портальной заявки внутренним пользователем.
 * Сервер допускает PUT только для ADMIN/MANAGER (см. /api/portal/requests/[id]),
 * этот компонент рендерится только под этой ролью.
 */
type Status = "NEW" | "IN_PROGRESS" | "READY";

const LABEL: Record<Status, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  READY: "Готова",
};

const COLOR: Record<Status, string> = {
  NEW: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
};

export function PortalStatusPicker({
  requestId,
  initial,
}: {
  requestId: string;
  initial: Status;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initial);
  const [saving, setSaving] = useState(false);

  async function update(next: Status) {
    const prev = status;
    setStatus(next);
    setSaving(true);
    const res = await fetch(`/api/portal/requests/${requestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setStatus(prev);
      return;
    }
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={(v) => update(v as Status)} disabled={saving}>
      <SelectTrigger
        className={`h-7 w-auto min-w-32 px-2.5 text-xs rounded-full font-medium border-0 shadow-none ${COLOR[status]}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(LABEL) as Status[]).map((k) => (
          <SelectItem key={k} value={k} className="text-xs">
            {LABEL[k]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
