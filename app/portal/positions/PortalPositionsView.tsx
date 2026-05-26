"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";

type Position = {
  id: string;
  name: string;
  unit: string;
  createdAt: Date | string;
};

export function PortalPositionsView({ initialPositions }: { initialPositions: Position[] }) {
  const [positions, setPositions] = useState(initialPositions);
  const [error, setError] = useState<string | null>(null);

  // ─── Создание ──────────────────────────────────────────────────────────────
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("шт");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/portal/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), unit: newUnit.trim() || "шт" }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data?.error ?? "Не удалось добавить");
      return;
    }
    setPositions((cur) => [...cur, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
    setNewUnit("шт");
  }

  // ─── Редактирование ────────────────────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");

  const startEdit = (p: Position) => {
    setEditId(p.id);
    setEditName(p.name);
    setEditUnit(p.unit);
  };
  const cancelEdit = () => setEditId(null);

  async function saveEdit() {
    if (!editId) return;
    const res = await fetch(`/api/portal/positions/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), unit: editUnit.trim() || "шт" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "Не удалось сохранить");
      return;
    }
    setPositions((cur) =>
      cur.map((p) => (p.id === editId ? data : p)).sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditId(null);
  }

  // ─── Удаление ──────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Удалить позицию?")) return;
    const res = await fetch(`/api/portal/positions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPositions((cur) => cur.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <h1 className="text-lg font-semibold text-slate-900">Моя номенклатура</h1>
      <p className="text-sm text-slate-500 -mt-3">
        Список ваших позиций — их удобно вставлять в заявки одним кликом.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-12 gap-2"
      >
        <div className="col-span-12 sm:col-span-8">
          <Input
            placeholder="Название позиции"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="col-span-7 sm:col-span-2">
          <Input placeholder="Ед." value={newUnit} onChange={(e) => setNewUnit(e.target.value)} maxLength={50} />
        </div>
        <div className="col-span-5 sm:col-span-2">
          <Button type="submit" className="w-full" disabled={!newName.trim() || creating}>
            <Plus className="mr-1 h-4 w-4" /> {creating ? "…" : "Добавить"}
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {positions.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">Номенклатура пуста</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {positions.map((p) => (
              <li key={p.id} className="px-4 py-3">
                {editId === p.id ? (
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-8">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={500} />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} maxLength={50} />
                    </div>
                    <div className="col-span-6 sm:col-span-2 flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={saveEdit} title="Сохранить">
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit} title="Отмена">
                        <X className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.unit}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(p)} title="Изменить">
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(p.id)}
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
