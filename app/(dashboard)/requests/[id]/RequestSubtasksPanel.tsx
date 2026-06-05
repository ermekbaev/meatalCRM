"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Archive, ChevronDown, ChevronRight, Check, Pencil, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Subtask = {
  id: string;
  name: string;
  done: boolean;
  archivedAt: string | null;
  order: number;
};

type Category = {
  id: string;
  name: string;
  archivedAt: string | null;
  subtasks: Subtask[];
};

export function RequestSubtasksPanel({
  requestId,
  initialCategories,
  readOnly,
  apiBase,
}: {
  requestId: string;
  initialCategories: Category[];
  readOnly?: boolean;
  apiBase?: string;
}) {
  const base = apiBase ?? `/api/requests/${requestId}`;
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showArchived, setShowArchived] = useState<Record<string, boolean>>({});
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  // ─── Добавить категорию ────────────────────────────────────────────────────
  async function createCategory() {
    const name = newCatName.trim();
    if (!name) return;
    setAddingCat(true);
    const res = await fetch(`${base}/subtask-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setAddingCat(false);
    if (!res.ok) return;
    const cat: Category = await res.json();
    setCategories((cur) => [...cur, cat]);
    setNewCatName("");
  }

  async function archiveCategory(catId: string) {
    const res = await fetch(`${base}/subtask-categories/${catId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) setCategories((cur) => cur.filter((c) => c.id !== catId));
  }

  async function deleteCategory(catId: string) {
    if (!confirm("Удалить категорию и все её подзадачи?")) return;
    const res = await fetch(`${base}/subtask-categories/${catId}`, { method: "DELETE" });
    if (res.ok) setCategories((cur) => cur.filter((c) => c.id !== catId));
  }

  async function renameCategory(catId: string, name: string) {
    const res = await fetch(`${base}/subtask-categories/${catId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setCategories((cur) => cur.map((c) => c.id === catId ? { ...c, name } : c));
    }
    setEditingCatId(null);
  }

  // ─── Подзадачи ─────────────────────────────────────────────────────────────
  const [newSubNames, setNewSubNames] = useState<Record<string, string>>({});
  const [addingSub, setAddingSub] = useState<string | null>(null);
  const subInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function createSubtask(catId: string) {
    const name = (newSubNames[catId] ?? "").trim();
    if (!name) return;
    setAddingSub(catId);
    const res = await fetch(`${base}/subtask-categories/${catId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setAddingSub(null);
    if (!res.ok) return;
    const sub: Subtask = await res.json();
    setCategories((cur) =>
      cur.map((c) => c.id === catId ? { ...c, subtasks: [...c.subtasks, sub] } : c)
    );
    setNewSubNames((cur) => ({ ...cur, [catId]: "" }));
    subInputRefs.current[catId]?.focus();
  }

  async function toggleDone(catId: string, subId: string, done: boolean) {
    const res = await fetch(`${base}/subtask-categories/${catId}/subtasks/${subId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    if (res.ok) {
      setCategories((cur) =>
        cur.map((c) => c.id === catId
          ? { ...c, subtasks: c.subtasks.map((s) => s.id === subId ? { ...s, done } : s) }
          : c
        )
      );
    }
  }

  async function archiveSubtask(catId: string, subId: string) {
    const res = await fetch(`${base}/subtask-categories/${catId}/subtasks/${subId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      setCategories((cur) =>
        cur.map((c) => c.id === catId
          ? { ...c, subtasks: c.subtasks.map((s) => s.id === subId ? { ...s, archivedAt: new Date().toISOString() } : s) }
          : c
        )
      );
    }
  }

  async function deleteSubtask(catId: string, subId: string) {
    const res = await fetch(`${base}/subtask-categories/${catId}/subtasks/${subId}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((cur) =>
        cur.map((c) => c.id === catId ? { ...c, subtasks: c.subtasks.filter((s) => s.id !== subId) } : c)
      );
    }
  }

  async function archiveCompleted(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const toArchive = cat.subtasks.filter((s) => s.done && !s.archivedAt);
    for (const s of toArchive) {
      await archiveSubtask(catId, s.id);
    }
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const visible = cat.subtasks.filter((s) => !s.archivedAt);
        const archived = cat.subtasks.filter((s) => s.archivedAt);
        const doneCount = visible.filter((s) => s.done).length;
        const isCollapsed = collapsed[cat.id];
        const showingArchived = showArchived[cat.id];

        return (
          <div key={cat.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Заголовок категории */}
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [cat.id]: !c[cat.id] }))}
                  className="text-slate-400 hover:text-slate-700"
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {editingCatId === cat.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      autoFocus
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="h-7 text-sm"
                      onKeyDown={(e) => { if (e.key === "Enter") renameCategory(cat.id, editCatName); if (e.key === "Escape") setEditingCatId(null); }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => renameCategory(cat.id, editCatName)}><Check className="h-3.5 w-3.5 text-emerald-600" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCatId(null)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-slate-800 truncate">{cat.name}</span>
                )}
                {visible.length > 0 && (
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {doneCount}/{visible.length}
                  </span>
                )}
              </div>
              {!readOnly && editingCatId !== cat.id && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {doneCount > 0 && (
                    <button
                      type="button"
                      onClick={() => archiveCompleted(cat.id)}
                      title="Архивировать выполненные"
                      className="rounded p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name); }}
                    title="Переименовать"
                    className="rounded p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat.id)}
                    title="Удалить категорию"
                    className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Чек-лист */}
            {!isCollapsed && (
              <div className="px-4 py-2 space-y-0.5">
                {visible.map((sub) => (
                  <div key={sub.id} className={cn("group flex items-center gap-2 py-1.5 rounded-lg px-1", sub.done && "opacity-60")}>
                    <input
                      type="checkbox"
                      checked={sub.done}
                      disabled={readOnly}
                      onChange={(e) => toggleDone(cat.id, sub.id, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-orange-500 cursor-pointer disabled:cursor-default"
                    />
                    <span className={cn("flex-1 text-sm text-slate-800", sub.done && "line-through text-slate-400")}>
                      {sub.name}
                    </span>
                    {!readOnly && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {sub.done && (
                          <button
                            type="button"
                            onClick={() => archiveSubtask(cat.id, sub.id)}
                            title="Архивировать"
                            className="rounded p-1 text-slate-400 hover:text-amber-600"
                          >
                            <Archive className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteSubtask(cat.id, sub.id)}
                          title="Удалить"
                          className="rounded p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Архивированные (скрытые) */}
                {archived.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowArchived((c) => ({ ...c, [cat.id]: !c[cat.id] }))}
                      className="mt-1 text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      <Archive className="h-3 w-3" />
                      {showingArchived ? "Скрыть архив" : `Архив (${archived.length})`}
                    </button>
                    {showingArchived && (
                      <div className="mt-1 space-y-0.5 opacity-50">
                        {archived.map((sub) => (
                          <div key={sub.id} className="group flex items-center gap-2 py-1 px-1">
                            <input type="checkbox" checked={sub.done} disabled className="h-4 w-4 rounded accent-orange-500" />
                            <span className="flex-1 text-sm text-slate-400 line-through">{sub.name}</span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => deleteSubtask(cat.id, sub.id)}
                                className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-400 hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Поле добавления подзадачи */}
                {!readOnly && (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      ref={(el) => { subInputRefs.current[cat.id] = el; }}
                      placeholder="Добавить подзадачу..."
                      value={newSubNames[cat.id] ?? ""}
                      onChange={(e) => setNewSubNames((c) => ({ ...c, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") createSubtask(cat.id); }}
                      className="h-8 text-sm"
                      disabled={addingSub === cat.id}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => createSubtask(cat.id)}
                      disabled={addingSub === cat.id || !(newSubNames[cat.id] ?? "").trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Добавить категорию */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Название категории (напр. «Кабина лифта»)..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createCategory(); }}
            className="h-9 text-sm"
            disabled={addingCat}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={createCategory}
            disabled={addingCat || !newCatName.trim()}
          >
            <Plus className="mr-1 h-4 w-4" /> Добавить категорию
          </Button>
        </div>
      )}
    </div>
  );
}
