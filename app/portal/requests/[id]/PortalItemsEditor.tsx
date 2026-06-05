"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Item = { id: string; name: string; quantity: number; unit: string; price: number | null };
type PositionFile = { id: string; filename: string; originalName: string; size: number; kind: string };
type Position = { id: string; name: string; unit: string; price: number | null; folderId: string | null; files?: PositionFile[] };
type FolderItem = { id: string; name: string };

type Row = {
  id: string | null;
  key: string;
  name: string;
  quantity: string;
  unit: string;
  price: string;
  positionId?: string;
  saving: boolean;
};

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function parsePrice(raw: string): number | null {
  const v = raw.trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
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
  folders,
  readOnly = false,
}: {
  requestId: string;
  initialItems: Item[];
  positions: Position[];
  folders: FolderItem[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    initialItems.map((i) => ({
      id: i.id,
      key: i.id,
      name: i.name,
      quantity: String(i.quantity),
      unit: i.unit,
      price: i.price == null ? "" : String(i.price),
      saving: false,
    }))
  );
  const [pickPositionId, setPickPositionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function patch(key: string, p: Partial<Row>) {
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  const total = rows.reduce((sum, r) => {
    const price = parsePrice(r.price);
    const qty = Number(r.quantity);
    if (price == null || !Number.isFinite(qty)) return sum;
    return sum + price * qty;
  }, 0);

  async function persist(row: Row) {
    const name = row.name.trim();
    if (!name) return;
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    const unit = row.unit.trim() || "шт";
    const price = parsePrice(row.price);

    patch(row.key, { saving: true });
    setError(null);
    try {
      if (row.id) {
        const res = await fetch(`/api/portal/requests/${requestId}/items/${row.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, quantity, unit, price }),
        });
        if (!res.ok) throw new Error(await readErr(res));
      } else {
        const res = await fetch(`/api/portal/requests/${requestId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, quantity, unit, price, positionId: row.positionId ?? undefined }),
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
      { id: null, key: makeKey(), name: "", quantity: "1", unit: "шт", price: "", saving: false },
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
      price: p.price == null ? "" : String(p.price),
      positionId: p.id,
      saving: true,
    };
    setRows((cur) => [...cur, row]);
    await persist(row);
  }

  // Read-only режим: заявка заблокирована (В работе / Готова).
  if (readOnly) {
    return (
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
            Позиции не указаны
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => {
                const price = parsePrice(r.price);
                const qty = Number(r.quantity);
                return (
                  <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-sm text-slate-800 min-w-0 truncate">{r.name}</span>
                    <span className="text-sm text-slate-600 whitespace-nowrap">
                      {r.quantity} {r.unit}
                      {price != null && (
                        <>
                          {" · "}
                          <span className="text-slate-500">{formatCurrency(price)}</span>
                          {Number.isFinite(qty) && (
                            <> {" = "}<span className="font-medium text-slate-800">{formatCurrency(price * qty)}</span></>
                          )}
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {total > 0 && (
              <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                Итого: <span className="ml-1 font-medium text-slate-900">{formatCurrency(total)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
              <div className="col-span-12 sm:col-span-5">
                <Input
                  placeholder="Название"
                  value={r.name}
                  onChange={(e) => patch(r.key, { name: e.target.value })}
                  onBlur={() => persist(r)}
                  disabled={r.saving}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
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
              <div className="col-span-3 sm:col-span-2">
                <Input
                  placeholder="Ед."
                  value={r.unit}
                  onChange={(e) => patch(r.key, { unit: e.target.value })}
                  onBlur={() => persist(r)}
                  disabled={r.saving}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Цена, ₽"
                  value={r.price}
                  onChange={(e) => patch(r.key, { price: e.target.value })}
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

      {total > 0 && (
        <div className="flex justify-end text-sm text-slate-600">
          Итого: <span className="ml-1 font-medium text-slate-900">{formatCurrency(total)}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={pickPositionId}
          onChange={(e) => setPickPositionId(e.target.value)}
          className="flex h-10 flex-1 min-w-45 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">— из моей номенклатуры —</option>
          {/* Сначала позиции без папки, затем — по папкам через optgroup. */}
          {positions
            .filter((p) => p.folderId == null)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit}){p.price != null ? ` · ${formatCurrency(p.price)}` : ""}
              </option>
            ))}
          {folders.map((f) => {
            const inFolder = positions.filter((p) => p.folderId === f.id);
            if (inFolder.length === 0) return null;
            return (
              <optgroup key={f.id} label={f.name}>
                {inFolder.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unit}){p.price != null ? ` · ${formatCurrency(p.price)}` : ""}
                  </option>
                ))}
              </optgroup>
            );
          })}
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
