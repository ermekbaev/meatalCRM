"use client";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, X, Pencil, Folder, FolderPlus, FileText, Paperclip, Loader2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

type Position = {
  id: string;
  name: string;
  unit: string;
  price: number | null;
  folderId: string | null;
  pdfKey: string | null;
  pdfName: string | null;
  createdAt: Date | string;
};

type FolderItem = {
  id: string;
  name: string;
  createdAt: Date | string;
};

const ALL = "__all__";
const NONE = "__none__";

function parsePrice(raw: string): number | null {
  const v = raw.trim().replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ─── Загрузка PDF через сервер ────────────────────────────────────────────────
async function uploadPdf(file: File): Promise<{ key: string; name: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/portal/positions/pdf-upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Не удалось загрузить PDF");
  }
  return res.json();
}

export function PortalPositionsView({
  initialPositions,
  initialFolders,
}: {
  initialPositions: Position[];
  initialFolders: FolderItem[];
}) {
  const [positions, setPositions] = useState(initialPositions);
  const [folders, setFolders] = useState(initialFolders);
  const [error, setError] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string>(ALL);

  // ─── Создание позиции ──────────────────────────────────────────────────────
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("шт");
  const [newPrice, setNewPrice] = useState("");
  const [creating, setCreating] = useState(false);
  const [newPdfKey, setNewPdfKey] = useState<string | null>(null);
  const [newPdfName, setNewPdfName] = useState<string | null>(null);
  const [newPdfUploading, setNewPdfUploading] = useState(false);
  const newFileRef = useRef<HTMLInputElement>(null);

  const targetFolderId =
    activeFolder === ALL || activeFolder === NONE ? null : activeFolder;

  async function handleNewPdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPdfUploading(true);
    setError(null);
    try {
      const { key, name } = await uploadPdf(file);
      setNewPdfKey(key);
      setNewPdfName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки PDF");
    } finally {
      setNewPdfUploading(false);
      if (newFileRef.current) newFileRef.current.value = "";
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/portal/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        unit: newUnit.trim() || "шт",
        price: parsePrice(newPrice),
        folderId: targetFolderId,
        pdfKey: newPdfKey,
        pdfName: newPdfName,
      }),
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
    setNewPrice("");
    setNewPdfKey(null);
    setNewPdfName(null);
  }

  // ─── Редактирование позиции ────────────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editFolderId, setEditFolderId] = useState<string>(NONE);
  const [editPdfKey, setEditPdfKey] = useState<string | null>(null);
  const [editPdfName, setEditPdfName] = useState<string | null>(null);
  const [editPdfUploading, setEditPdfUploading] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  const startEdit = (p: Position) => {
    setEditId(p.id);
    setEditName(p.name);
    setEditUnit(p.unit);
    setEditPrice(p.price == null ? "" : String(p.price));
    setEditFolderId(p.folderId ?? NONE);
    setEditPdfKey(p.pdfKey);
    setEditPdfName(p.pdfName);
  };
  const cancelEdit = () => setEditId(null);

  async function handleEditPdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPdfUploading(true);
    setError(null);
    try {
      const { key, name } = await uploadPdf(file);
      setEditPdfKey(key);
      setEditPdfName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки PDF");
    } finally {
      setEditPdfUploading(false);
      if (editFileRef.current) editFileRef.current.value = "";
    }
  }

  async function saveEdit() {
    if (!editId) return;
    const res = await fetch(`/api/portal/positions/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        unit: editUnit.trim() || "шт",
        price: parsePrice(editPrice),
        folderId: editFolderId === NONE ? null : editFolderId,
        pdfKey: editPdfKey,
        pdfName: editPdfName,
      }),
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

  async function handleDelete(id: string) {
    if (!confirm("Удалить позицию?")) return;
    const res = await fetch(`/api/portal/positions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPositions((cur) => cur.filter((p) => p.id !== id));
    }
  }

  // ─── Просмотр PDF ──────────────────────────────────────────────────────────
  async function openPdf(id: string) {
    const res = await fetch(`/api/portal/positions/${id}/pdf`);
    if (!res.ok) return;
    const { url } = await res.json();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ─── Папки ─────────────────────────────────────────────────────────────────
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderFormOpen, setFolderFormOpen] = useState(false);

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name || creatingFolder) return;
    setCreatingFolder(true);
    setError(null);
    const res = await fetch("/api/portal/positions/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setCreatingFolder(false);
    if (!res.ok) {
      setError(data?.error ?? "Не удалось создать папку");
      return;
    }
    setFolders((cur) => [...cur, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewFolderName("");
    setFolderFormOpen(false);
    setActiveFolder(data.id);
  }

  async function handleRenameFolder(id: string) {
    const current = folders.find((f) => f.id === id);
    if (!current) return;
    const name = prompt("Новое название папки", current.name)?.trim();
    if (!name || name === current.name) return;
    const res = await fetch(`/api/portal/positions/folders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "Не удалось переименовать");
      return;
    }
    setFolders((cur) =>
      cur.map((f) => (f.id === id ? data : f)).sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  async function handleDeleteFolder(id: string) {
    const folder = folders.find((f) => f.id === id);
    if (!folder) return;
    const inside = positions.filter((p) => p.folderId === id).length;
    const msg = inside
      ? `Удалить папку «${folder.name}»? Позиции внутри (${inside}) останутся без папки.`
      : `Удалить папку «${folder.name}»?`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/portal/positions/folders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Не удалось удалить папку");
      return;
    }
    setFolders((cur) => cur.filter((f) => f.id !== id));
    setPositions((cur) =>
      cur.map((p) => (p.folderId === id ? { ...p, folderId: null } : p))
    );
    if (activeFolder === id) setActiveFolder(ALL);
  }

  // ─── Фильтрация ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeFolder === ALL) return positions;
    if (activeFolder === NONE) return positions.filter((p) => p.folderId == null);
    return positions.filter((p) => p.folderId === activeFolder);
  }, [positions, activeFolder]);

  const countByFolder = useMemo(() => {
    const map = new Map<string, number>();
    let none = 0;
    for (const p of positions) {
      if (p.folderId == null) none += 1;
      else map.set(p.folderId, (map.get(p.folderId) ?? 0) + 1);
    }
    return { map, none };
  }, [positions]);

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

      {/* ─── Папки ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <FolderChip
            active={activeFolder === ALL}
            onClick={() => setActiveFolder(ALL)}
            label={`Все (${positions.length})`}
          />
          <FolderChip
            active={activeFolder === NONE}
            onClick={() => setActiveFolder(NONE)}
            label={`Без папки (${countByFolder.none})`}
          />
          {folders.map((f) => (
            <FolderChip
              key={f.id}
              active={activeFolder === f.id}
              onClick={() => setActiveFolder(f.id)}
              label={
                <span className="inline-flex items-center gap-1">
                  <Folder className="h-3.5 w-3.5" />
                  {f.name} ({countByFolder.map.get(f.id) ?? 0})
                </span>
              }
              onRename={() => handleRenameFolder(f.id)}
              onDelete={() => handleDeleteFolder(f.id)}
            />
          ))}
          {folderFormOpen ? (
            <form onSubmit={handleCreateFolder} className="inline-flex items-center gap-1">
              <Input
                autoFocus
                placeholder="Название папки"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                maxLength={200}
                className="h-8 w-44 text-sm"
              />
              <Button type="submit" size="sm" disabled={!newFolderName.trim() || creatingFolder}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => { setFolderFormOpen(false); setNewFolderName(""); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setFolderFormOpen(true)}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 text-xs text-slate-500 hover:border-orange-300 hover:text-orange-600"
            >
              <FolderPlus className="h-3.5 w-3.5" /> Папка
            </button>
          )}
        </div>
      </div>

      {/* ─── Форма создания позиции ────────────────────────────────────────── */}
      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
      >
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12 sm:col-span-6">
            <Input
              placeholder={
                targetFolderId
                  ? `Название позиции (в «${folders.find((f) => f.id === targetFolderId)?.name ?? ""}»)`
                  : "Название позиции"
              }
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="col-span-4 sm:col-span-2">
            <Input placeholder="Ед." value={newUnit} onChange={(e) => setNewUnit(e.target.value)} maxLength={50} />
          </div>
          <div className="col-span-4 sm:col-span-2">
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="Цена, ₽"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
          </div>
          <div className="col-span-4 sm:col-span-2">
            <Button type="submit" className="w-full" disabled={!newName.trim() || creating}>
              <Plus className="mr-1 h-4 w-4" /> {creating ? "…" : "Добавить"}
            </Button>
          </div>
        </div>

        {/* PDF-вложение для новой позиции */}
        <div className="flex items-center gap-2">
          <input
            ref={newFileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleNewPdfSelect}
          />
          {newPdfKey ? (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-700 ring-1 ring-orange-200">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-50 truncate">{newPdfName}</span>
              <button
                type="button"
                onClick={() => { setNewPdfKey(null); setNewPdfName(null); }}
                className="ml-0.5 hover:text-red-600"
                title="Убрать PDF"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={newPdfUploading}
              onClick={() => newFileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
            >
              {newPdfUploading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Загрузка…</>
                : <><Paperclip className="h-3.5 w-3.5" /> Прикрепить PDF</>
              }
            </button>
          )}
        </div>
      </form>

      {/* ─── Список позиций ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">Номенклатура пуста</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <li key={p.id} className="px-4 py-3">
                {editId === p.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-5">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={500} />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} maxLength={50} />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Цена, ₽"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <select
                          value={editFolderId}
                          onChange={(e) => setEditFolderId(e.target.value)}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value={NONE}>— без папки —</option>
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-12 sm:col-span-1 flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={saveEdit} title="Сохранить">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit} title="Отмена">
                          <X className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    </div>

                    {/* PDF в режиме редактирования */}
                    <div className="flex items-center gap-2 pl-0.5">
                      <input
                        ref={editFileRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={handleEditPdfSelect}
                      />
                      {editPdfKey ? (
                        <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-700 ring-1 ring-orange-200">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="max-w-50 truncate">{editPdfName}</span>
                          <button
                            type="button"
                            onClick={() => { setEditPdfKey(null); setEditPdfName(null); }}
                            className="ml-0.5 hover:text-red-600"
                            title="Удалить PDF"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={editPdfUploading}
                          onClick={() => editFileRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
                        >
                          {editPdfUploading
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Загрузка…</>
                            : <><Paperclip className="h-3.5 w-3.5" /> Прикрепить PDF</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">
                        {p.unit}
                        {p.price != null && <> · {formatCurrency(p.price)}</>}
                        {p.folderId && activeFolder === ALL && (
                          <>
                            {" · "}
                            <span className="inline-flex items-center gap-0.5 text-slate-500">
                              <Folder className="h-3 w-3" />
                              {folders.find((f) => f.id === p.folderId)?.name ?? "—"}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.pdfKey && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openPdf(p.id)}
                          title={p.pdfName ?? "Открыть PDF"}
                          className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
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

function FolderChip({
  active,
  onClick,
  label,
  onRename,
  onDelete,
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <span
      className={cn(
        "group inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-orange-100 text-orange-700 ring-1 ring-orange-200"
          : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
      )}
    >
      <button type="button" onClick={onClick} className="inline-flex items-center">
        {label}
      </button>
      {onRename && (
        <button
          type="button"
          onClick={onRename}
          title="Переименовать"
          className="opacity-0 group-hover:opacity-100 hover:text-slate-900"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Удалить папку"
          className="opacity-0 group-hover:opacity-100 hover:text-red-600"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
