"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

/**
 * Редактирование описания портальной заявки. Видно ADMIN/MANAGER (компонент
 * подключается только на админской странице). Серверный API принимает и от
 * CLIENT тоже — это используется в личном кабинете отдельным компонентом.
 */
export function PortalDescriptionEditor({
  requestId,
  initial,
}: {
  requestId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: value }),
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
    setValue(initial ?? "");
    setEditing(false);
    setError(null);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Описание заявки"
        />
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={cancel} disabled={saving}>
            Отмена
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm text-slate-400 hover:text-orange-600 inline-flex items-center gap-1"
      >
        <Pencil className="h-3 w-3" /> Добавить описание
      </button>
    );
  }

  return (
    <div className="group rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap relative">
      {value}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="absolute right-2 top-2 rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-slate-700 transition-opacity"
        title="Редактировать"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
