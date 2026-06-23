"use client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, ExternalLink, FileQuestion } from "lucide-react";

export type PreviewFile = { key: string; name: string; mimeType?: string | null };

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/** Можно ли показать файл в модалке-предпросмотре (картинка или PDF). */
export function canPreviewFile(name: string, mimeType?: string | null): boolean {
  const m = (mimeType ?? "").toLowerCase();
  if (m.startsWith("image/") || m === "application/pdf") return true;
  const ext = extOf(name);
  return ext === "pdf" || IMAGE_EXT.includes(ext);
}

function previewKind(name: string, mimeType?: string | null): "image" | "pdf" | null {
  const m = (mimeType ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf") return "pdf";
  const ext = extOf(name);
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXT.includes(ext)) return "image";
  return null;
}

/**
 * Модалка предпросмотра файла: PDF — через inline-iframe, картинки — через <img>.
 * Контент берётся из `/api/files?...&view=1` (сервер проксирует inline, без скачивания).
 * Передай `file` для открытия, `null` — закрыто. `onClose` вызывается при закрытии.
 */
export function FilePreviewModal({
  file,
  onClose,
}: {
  file: PreviewFile | null;
  onClose: () => void;
}) {
  const open = file != null;
  const viewUrl = file ? `/api/files?key=${encodeURIComponent(file.key)}&view=1` : "";
  const downloadUrl = file
    ? `/api/files?key=${encodeURIComponent(file.key)}&name=${encodeURIComponent(file.name)}`
    : "";
  const kind = file ? previewKind(file.name, file.mimeType) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl w-[calc(100%-1rem)] p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 pr-12">
          <DialogTitle className="text-sm font-medium text-gray-800 truncate">
            {file?.name}
          </DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Открыть в новой вкладке"
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={downloadUrl}
              title="Скачать"
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="flex min-h-[60vh] max-h-[80vh] items-center justify-center overflow-auto bg-slate-50 p-3">
          {kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewUrl}
              alt={file?.name}
              className="max-h-[78vh] max-w-full rounded object-contain"
            />
          )}
          {kind === "pdf" && (
            <iframe
              src={viewUrl}
              title={file?.name}
              className="h-[78vh] w-full rounded bg-white"
            />
          )}
          {kind === null && (
            <div className="flex flex-col items-center gap-2 text-center text-slate-500">
              <FileQuestion className="h-10 w-10 text-slate-300" />
              <p className="text-sm">
                Предпросмотр недоступен для этого типа файла.
                <br />
                Скачайте файл, чтобы открыть его.
              </p>
              <a href={downloadUrl} className="text-sm font-medium text-orange-600 hover:underline">
                Скачать файл
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
