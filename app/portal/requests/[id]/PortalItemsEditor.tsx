"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

type Item = { id: string; name: string; quantity: number; unit: string };
type Position = { id: string; name: string; unit: string };

type Row = {
  // Серверный id, либо null для новой строки, которую ещё не сохранили.
  id: string | null;
  // Локальный ключ для React (стабилен между ре-рендерами).
  key: string;
  name: string;
  quantity: string;
  unit: string;
  // true пока идёт POST/PUT, чтобы не плодить параллельных запросов.
  saving: boolean;
};

function makeKey() {
  return Math.random().toString(36).slice(2);
}

/**
 * Редактирование состава портальной заявки.
 *
 * Сохранение — на blur поля или после удаления/добавления. Для новой строки
 * требуем непустое имя, иначе она просто живёт локально, пока пользователь
 * не введёт название. Сервер принимает PUT/POST/DELETE на /items роуты.
 */
export function PortalItemsEditor({
  requestId,
  initialItems,
  positions,
}: {
  requestId: string;
  initialItems: Item[];
  positions: Position[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    initialItems.map((i) => ({
      id: i.id,
      key: i.id,
      name: i.name,
      quantity: String(i.quantity),
      unit: i.unit,
      saving: false,
    }))
  );
  const [pickPositionId, setPickPositionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function patch(key: string, p: Partial<Row>) {
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  async function persist(row: Row) {
    const name = row.name.trim();
    if (!name) return;
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    const unit = row.unit.trim() || "шт";

    patch(row.key, { saving: true });
    setError(null);
    try {
      if (row.id) {
        const res = await fetch(`/api/portal/requests/${requestId}/items/${row.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, quantity, unit }),
        });
        if (!res.ok) throw new Error(await readErr(res));
      } else {
        const res = await fetch(`/api/portal/requests/${requestId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, quantity, unit }),
        });
        if (!res.ok) throw new Error(await readErr(res));
        const created = (await res.json()) as Item;
        patch(row.key, { id: created.id });
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      patch(row.key, { saving: false });
    }
  }

  async function remove(row: Row) {
    if (!row.id) {
      // Локальная строка, ещё не сохранённая — просто убираем.
      setRows((cur) => cur.filter((r) => r.key !== row.key));
      return;
    }
    if (!confirm("Удалить позицию?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/portal/requests/${requestId}/items/${row.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readErr(res));
      setRows((cur) => cur.filter((r) => r.key !== row.key));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  }

  function addCustom() {
    setRows((cur) => [
      ...cur,
      { id: null, key: makeKey(), name: "", quantity: "1", unit: "шт", saving: false },
    ]);
  }

  async function addFromCatalog() {
    const p = positions.find((x) => x.id === pickPositionId);
    if (!p) return;
    setPickPositionId("");
    // Сразу POST-им — у позиции уже есть валидное имя и единица.
    const row: Row = {
      id: null,
      key: makeKey(),
      name: p.name,
      quantity: "1",
      unit: p.unit,
      saving: true,
    };
    setRows((cur) => [...cur, row]);
    await persist(row);
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="grid grid-cols-12 gap-2 items-start rounded-lg border border-slate-200 bg-white p-2">
              <div className="col-span-12 sm:col-span-7">
                <Input
                  placeholder="Название"
                  value={r.name}
                  onChange={(e) => patch(r.key, { name: e.target.value })}
                  onBlur={() => persist(r)}
                  disabled={r.saving}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Кол-во"
                  value={r.quantity}
                  onChange={(e) => patch(r.key, { quantity: e.target.value })}
                  onBlur={() => persist(r)}
                  disabled={r.saving}
                />
              </div>
              <div className="col-span-5 sm:col-span-2">
                <Input
                  placeholder="Ед."
                  value={r.unit}
                  onChange={(e) => patch(r.key, { unit: e.target.value })}
                  onBlur={() => persist(r)}
                  disabled={r.saving}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button type="button" size="icon" variant="ghost" onClick={() => remove(r)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={pickPositionId}
          onChange={(e) => setPickPositionId(e.target.value)}
          className="flex h-10 flex-1 min-w-45 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">— из моей номенклатуры —</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.unit})
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={addFromCatalog} disabled={!pickPositionId}>
          <Plus className="mr-1 h-4 w-4" /> Добавить
        </Button>
      </div>

      <Button type="button" variant="outline" onClick={addCustom} className="w-full">
        <Plus className="mr-1 h-4 w-4" /> Своя позиция
      </Button>
    </div>
  );
}

async function readErr(res: Response): Promise<string> {
  try {
    const d = await res.json();
    if (d?.fields) return Object.values(d.fields as Record<string, string>).join("; ");
    return d?.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}
