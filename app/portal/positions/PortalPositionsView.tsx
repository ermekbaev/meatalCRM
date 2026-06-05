"use client";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Check, X, Pencil, Folder, FolderPlus,
  FileText, Paperclip, Loader2, Download,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

type PositionFile = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  kind: string;
};

type Position = {
  id: string;
  name: string;
  unit: string;
  price: number | null;
  folderId: string | null;
  createdAt: Date | string;
  files: PositionFile[];
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

async function uploadPositionFile(positionId: string, file: File): Promise<PositionFile> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/portal/positions/${positionId}/files`, { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "Не удалось загрузить файл");
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

  const targetFolderId =
    activeFolder === ALL || activeFolder === NONE ? null : activeFolder;

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
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(data?.error ?? "Не удалось добавить"); return; }
    setPositions((cur) => [...cur, { ...data, files: [] }].sort((a, b) => a.name.localeCompare(b.name, "ru")));
    setNewName(""); setNewUnit("шт"); setNewPrice("");
  }

  // ─── Редактирование позиции (только имя/ед./цена/папка) ───────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editFolderId, setEditFolderId] = useState<string>(NONE);

  const startEdit = (p: Position) => {
    setEditId(p.id);
    setEditName(p.name);
    setEditUnit(p.unit);
    setEditPrice(p.price == null ? "" : String(p.price));
    setEditFolderId(p.folderId ?? NONE);
  };
  const cancelEdit = () => setEditId(null);

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
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data?.error ?? "Не удалось сохранить"); return; }
    setPositions((cur) =>
      cur
        .map((p) => (p.id === editId ? { ...data, files: p.files } : p))
        .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    );
    setEditId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить позицию?")) return;
    const res = await fetch(`/api/portal/positions/${id}`, { method: "DELETE" });
    if (res.ok) setPositions((cur) => cur.filter((p) => p.id !== id));
  }

  // ─── Управление файлами позиции ────────────────────────────────────────────
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFileSelect(positionId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(positionId);
    setError(null);
    try {
      const created = await uploadPositionFile(positionId, file);
      setPositions((cur) =>
        cur.map((p) => p.id === positionId ? { ...p, files: [...p.files, created] } : p)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploadingId(null);
      if (fileRefs.current[positionId]) fileRefs.current[positionId]!.value = "";
    }
    e.target.value = "";
  }

  async function handleFileDelete(positionId: string, fileId: string) {
    if (!confirm("Удалить файл?")) return;
    const res = await fetch(`/api/portal/positions/${positionId}/files/${fileId}`, { method: "DELETE" });
    if (res.ok) {
      setPositions((cur) =>
        cur.map((p) => p.id === positionId ? { ...p, files: p.files.filter((f) => f.id !== fileId) } : p)
      );
    }
  }

  function openFile(filename: string, originalName: string) {
    const url = `/api/files?key=${encodeURIComponent(filename)}&name=${encodeURIComponent(originalName)}`;
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
    if (!res.ok) { setError(data?.error ?? "Не удалось создать папку"); return; }
    setFolders((cur) => [...cur, data].sort((a, b) => a.name.localeCompare(b.name, "ru")));
    setNewFolderName(""); setFolderFormOpen(false); setActiveFolder(data.id);
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
    if (!res.ok) { setError(data?.error ?? "Не удалось переименовать"); return; }
    setFolders((cur) => cur.map((f) => (f.id === id ? data : f)).sort((a, b) => a.name.localeCompare(b.name, "ru")));
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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d?.error ?? "Не удалось удалить"); return; }
    setFolders((cur) => cur.filter((f) => f.id !== id));
    setPositions((cur) => cur.map((p) => (p.folderId === id ? { ...p, folderId: null } : p)));
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
        Список ваших позиций — их удобно вставлять в заявки одним кликом. К каждой можно прикрепить PDF и DXF файлы.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ─── Папки ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <FolderChip active={activeFolder === ALL} onClick={() => setActiveFolder(ALL)} label={`Все (${positions.length})`} />
          <FolderChip active={activeFolder === NONE} onClick={() => setActiveFolder(NONE)} label={`Без папки (${countByFolder.none})`} />
          {folders.map((f) => (
            <FolderChip
              key={f.id}
              active={activeFolder === f.id}
              onClick={() => setActiveFolder(f.id)}
              label={<span className="inline-flex items-center gap-1"><Folder className="h-3.5 w-3.5" />{f.name} ({countByFolder.map.get(f.id) ?? 0})</span>}
              onRename={() => handleRenameFolder(f.id)}
              onDelete={() => handleDeleteFolder(f.id)}
            />
          ))}
          {folderFormOpen ? (
            <form onSubmit={handleCreateFolder} className="inline-flex items-center gap-1">
              <Input autoFocus placeholder="Название папки" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} maxLength={200} className="h-8 w-44 text-sm" />
              <Button type="submit" size="sm" disabled={!newFolderName.trim() || creatingFolder}><Check className="h-4 w-4" /></Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setFolderFormOpen(false); setNewFolderName(""); }}><X className="h-4 w-4" /></Button>
            </form>
          ) : (
            <button type="button" onClick={() => setFolderFormOpen(true)} className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 text-xs text-slate-500 hover:border-orange-300 hover:text-orange-600">
              <FolderPlus className="h-3.5 w-3.5" /> Папка
            </button>
          )}
        </div>
      </div>

      {/* ─── Форма создания позиции ────────────────────────────────────────── */}
      <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12 sm:col-span-6">
            <Input
              placeholder={targetFolderId ? `Название позиции (в «${folders.find((f) => f.id === targetFolderId)?.name ?? ""}»)` : "Название позиции"}
              value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={500}
            />
          </div>
          <div className="col-span-4 sm:col-span-2">
            <Input placeholder="Ед." value={newUnit} onChange={(e) => setNewUnit(e.target.value)} maxLength={50} />
          </div>
          <div className="col-span-4 sm:col-span-2">
            <Input type="number" step="any" min="0" placeholder="Цена, ₽" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </div>
          <div className="col-span-4 sm:col-span-2">
            <Button type="submit" className="w-full" disabled={!newName.trim() || creating}>
              <Plus className="mr-1 h-4 w-4" /> {creating ? "…" : "Добавить"}
            </Button>
          </div>
        </div>
      </form>

      {/* ─── Список позиций ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">Номенклатура пуста</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <li key={p.id} className="px-4 py-3 space-y-2">
                {editId === p.id ? (
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-5">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={500} />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} maxLength={50} />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input type="number" step="any" min="0" placeholder="Цена, ₽" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <select value={editFolderId} onChange={(e) => setEditFolderId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                        <option value={NONE}>— без папки —</option>
                        {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={saveEdit} title="Сохранить"><Check className="h-4 w-4 text-emerald-600" /></Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit} title="Отмена"><X className="h-4 w-4 text-slate-500" /></Button>
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
                          <> · <span className="inline-flex items-center gap-0.5 text-slate-500"><Folder className="h-3 w-3" />{folders.find((f) => f.id === p.folderId)?.name ?? "—"}</span></>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(p)} title="Изменить"><Pencil className="h-4 w-4 text-slate-500" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)} title="Удалить"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                )}

                {/* ─── Файлы позиции ─────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2 pl-0.5">
                  {p.files.map((f) => (
                    <div key={f.id} className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1",
                      f.kind === "DXF"
                        ? "bg-violet-50 text-violet-700 ring-violet-200"
                        : "bg-orange-50 text-orange-700 ring-orange-200"
                    )}>
                      <FileText className="h-3 w-3 shrink-0" />
                      <button
                        type="button"
                        onClick={() => openFile(f.filename, f.originalName)}
                        className="max-w-40 truncate hover:underline"
                        title={f.originalName}
                      >
                        {f.originalName}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFileDelete(p.id, f.id)}
                        className="ml-0.5 hover:text-red-600"
                        title="Удалить файл"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Upload button */}
                  <input
                    ref={(el) => { fileRefs.current[p.id] = el; }}
                    type="file"
                    accept=".pdf,.dxf,application/pdf,application/dxf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(p.id, e)}
                  />
                  <button
                    type="button"
                    disabled={uploadingId === p.id}
                    onClick={() => fileRefs.current[p.id]?.click()}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-[11px] text-slate-500 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
                  >
                    {uploadingId === p.id
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Загрузка…</>
                      : <><Paperclip className="h-3 w-3" /> PDF / DXF</>
                    }
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FolderChip({
  active, onClick, label, onRename, onDelete,
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <span className={cn("group inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors", active ? "bg-orange-100 text-orange-700 ring-1 ring-orange-200" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100")}>
      <button type="button" onClick={onClick} className="inline-flex items-center">{label}</button>
      {onRename && (
        <button type="button" onClick={onRename} title="Переименовать" className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-orange-600">
          <Pencil className="h-2.5 w-2.5" />
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} title="Удалить папку" className="opacity-0 group-hover:opacity-100 hover:text-red-500">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}
