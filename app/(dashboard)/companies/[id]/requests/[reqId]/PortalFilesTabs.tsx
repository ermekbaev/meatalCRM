"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, FileSpreadsheet, Paperclip, Trash2, Upload } from "lucide-react";
import { FilePreviewModal, canPreviewFile, type PreviewFile } from "@/components/ui/file-preview-modal";
import { Button } from "@/components/ui/button";
import { uploadViaPresign } from "@/lib/upload-client";

type FileRec = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  uploadedBy: { id: string; name: string };
};

type Kind = "DRAWING" | "DOCUMENT";

/**
 * Табы «Чертежи / Документы» для админ-страницы заявки.
 * Чертежи — read-only (грузит клиент в кабинете), но админ может скачать
 * выбранные/все архивом и удалить ненужные. Документы — полная загрузка
 * и удаление силами ADMIN/MANAGER.
 */
export function PortalFilesTabs({
  requestId,
  drawings,
  documents,
}: {
  requestId: string;
  drawings: FileRec[];
  documents: FileRec[];
}) {
  const [tab, setTab] = useState<Kind>("DRAWING");
  const [drawingsState, setDrawings] = useState(drawings);
  const [documentsState, setDocuments] = useState(documents);

  return (
    <section>
      <div className="mb-2 flex items-center gap-1 border-b border-slate-200">
        <TabButton active={tab === "DRAWING"} onClick={() => setTab("DRAWING")}>
          <Paperclip className="h-4 w-4" /> Чертежи ({drawingsState.length})
        </TabButton>
        <TabButton active={tab === "DOCUMENT"} onClick={() => setTab("DOCUMENT")}>
          <FileSpreadsheet className="h-4 w-4" /> Документы ({documentsState.length})
        </TabButton>
      </div>

      {tab === "DRAWING" ? (
        <FileList
          requestId={requestId}
          kind="DRAWING"
          files={drawingsState}
          onChange={setDrawings}
          emptyText="Чертежей нет"
          allowUpload
          uploadLabel="Загрузить чертёж"
        />
      ) : (
        <FileList
          requestId={requestId}
          kind="DOCUMENT"
          files={documentsState}
          onChange={setDocuments}
          emptyText="Документов нет"
          allowUpload
        />
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
        active
          ? "border-orange-500 text-orange-600 font-medium"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function FileList({
  requestId,
  kind,
  files,
  onChange,
  emptyText,
  allowUpload = false,
  uploadLabel = "Загрузить документ",
}: {
  requestId: string;
  kind: Kind;
  files: FileRec[];
  onChange: (next: FileRec[]) => void;
  emptyText: string;
  allowUpload?: boolean;
  uploadLabel?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = files.length > 0 && selected.size === files.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleOne(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(files.map((f) => f.id)));
  }

  async function downloadZip(ids?: string[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/requests/${requestId}/files/zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids && ids.length > 0 ? { ids } : { kind }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Не удалось сформировать архив (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename\*=UTF-8''([^;]+)/)?.[1]
          ? decodeURIComponent(res.headers.get("Content-Disposition")!.match(/filename\*=UTF-8''([^;]+)/)![1])
          : `${kind === "DRAWING" ? "drawings" : "documents"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Удалить выбранные файлы (${ids.length} шт.)?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/requests/${requestId}/files/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Не удалось удалить (HTTP ${res.status})`);
      }
      onChange(files.filter((f) => !selected.has(f.id)));
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const created = await uploadViaPresign<FileRec>(
        `/api/portal/requests/${requestId}/files`,
        file,
        { kind }
      );
      onChange([...files, created]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-slate-50 px-3 py-1.5 text-xs">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked;
              }}
              onChange={toggleAll}
              className="h-3.5 w-3.5"
            />
            <span className="text-slate-600">
              {selected.size > 0 ? `Выбрано: ${selected.size}` : "Выбрать всё"}
            </span>
          </label>
          <div className="ml-auto flex items-center gap-1.5">
            {selected.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadZip([...selected])}
                disabled={busy}
                className="h-7"
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Скачать выбранные
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadZip()}
              disabled={busy}
              className="h-7"
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Скачать всё
            </Button>
            {selected.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={deleteSelected}
                disabled={busy}
                className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Удалить
              </Button>
            )}
          </div>
        </div>
      )}

      {files.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400 text-center">
          {emptyText}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(f.id)}
                onChange={() => toggleOne(f.id)}
                className="h-3.5 w-3.5"
              />
              {canPreviewFile(f.originalName) ? (
                <button
                  type="button"
                  onClick={() => setPreviewFile({ key: f.filename, name: f.originalName })}
                  className="flex-1 truncate text-left text-slate-700 hover:text-orange-600"
                  title="Предпросмотр"
                >
                  {f.originalName}
                </button>
              ) : (
                <a
                  href={`/api/files?key=${encodeURIComponent(f.filename)}&name=${encodeURIComponent(f.originalName)}`}
                  className="flex-1 truncate text-slate-700 hover:text-orange-600"
                >
                  {f.originalName}
                </a>
              )}
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {(f.size / 1024).toFixed(0)} КБ · {f.uploadedBy.name}
              </span>
              {canPreviewFile(f.originalName) && (
                <button
                  type="button"
                  onClick={() => setPreviewFile({ key: f.filename, name: f.originalName })}
                  className="text-slate-400 hover:text-orange-600"
                  title="Предпросмотр"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              <a
                href={`/api/files?key=${encodeURIComponent(f.filename)}&name=${encodeURIComponent(f.originalName)}`}
                className="text-slate-400 hover:text-slate-700"
                title="Скачать"
              >
                <Download className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {allowUpload && (
        <>
          <input ref={fileInputRef} type="file" className="hidden" onChange={onUpload} />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-1 h-4 w-4" />
            {uploading ? "Загрузка..." : uploadLabel}
          </Button>
        </>
      )}

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
