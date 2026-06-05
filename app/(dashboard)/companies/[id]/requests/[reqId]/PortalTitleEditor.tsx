"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

export function PortalTitleEditor({
  requestId,
  initial,
}: {
  requestId: string;
  initial: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!value.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: value.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `Не удалось сохранить (HTTP ${res.status})`);
        return;
      }
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сетевая ошибка");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setValue(initial);
    setEditing(false);
    setError(null);
  }

  if (editing) {
    return (
      <div className="space-y-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={500}
          className="text-base font-semibold"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
        />
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={save} disabled={saving || !value.trim()}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={cancel} disabled={saving}>
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <h2 className="text-lg font-semibold text-slate-900">{value}</h2>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600 transition-opacity"
        title="Редактировать название"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
