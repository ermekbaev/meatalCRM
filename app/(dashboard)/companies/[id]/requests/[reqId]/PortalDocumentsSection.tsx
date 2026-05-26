"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Upload } from "lucide-react";

type FileRec = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  uploadedBy: { id: string; name: string };
};

/**
 * Документы (счета, договоры, акты) для портальной заявки.
 * Грузит ADMIN/MANAGER, клиент только скачивает (см. /api/portal/requests/[id]/files).
 * UI чертежей остался read-only в server-component — это отдельный блок ровно
 * под загрузку.
 */
export function PortalDocumentsSection({
  requestId,
  initial,
}: {
  requestId: string;
  initial: FileRec[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileRec[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "DOCUMENT");
    try {
      const res = await fetch(`/api/portal/requests/${requestId}/files`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `Не удалось загрузить (HTTP ${res.status})`);
        return;
      }
      const created = (await res.json()) as FileRec;
      setFiles((cur) => [...cur, created]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(fileId: string) {
    if (!confirm("Удалить документ?")) return;
    const res = await fetch(`/api/portal/requests/${requestId}/files/${fileId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? `Не удалось удалить (HTTP ${res.status})`);
      return;
    }
    setFiles((cur) => cur.filter((f) => f.id !== fileId));
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {files.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400 text-center">
          Документов нет
        </div>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <a
                href={`/api/files?key=${encodeURIComponent(f.filename)}&name=${encodeURIComponent(f.originalName)}`}
                className="truncate text-slate-700 hover:text-orange-600"
              >
                {f.originalName}
              </a>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xs text-slate-400">
                  {(f.size / 1024).toFixed(0)} КБ · {f.uploadedBy.name}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(f.id)}
                  className="text-red-500 hover:text-red-600"
                  title="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <input ref={fileInputRef} type="file" className="hidden" onChange={onUpload} />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="mr-1 h-4 w-4" />
        {uploading ? "Загрузка..." : "Загрузить документ"}
      </Button>
    </div>
  );
}
