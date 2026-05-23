"use client";
import { File, FileText, Archive } from "lucide-react";

/** Удобочитаемый размер файла (Б / КБ / МБ). */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Иконка для файла по MIME/расширению. */
export function getFileIcon(mimeType?: string, fileName?: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "dxf") return <File className="h-4 w-4 text-purple-400" />;
  if (ext === "rar" || ext === "zip") return <Archive className="h-4 w-4 text-yellow-500" />;
  if (!mimeType) return <FileText className="h-4 w-4 text-gray-400" />;
  if (mimeType.startsWith("image/")) return <FileText className="h-4 w-4 text-blue-400" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-400" />;
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed" || mimeType === "application/vnd.rar" || mimeType === "application/x-rar-compressed") return <Archive className="h-4 w-4 text-yellow-500" />;
  return <FileText className="h-4 w-4 text-gray-400" />;
}

/** Дату → строка для `<input type="date">` (YYYY-MM-DD), либо "". */
export function formatDateInput(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** Подзадача просрочена, если её срок прошёл и она не завершена. */
export function isSubTaskOverdue(item: { dueDate?: string | Date | null; status?: string | null }) {
  if (!item.dueDate || item.status === "DONE") return false;
  const due = new Date(item.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

/** Подсвечивает @упоминания синим в тексте комментария. */
export function renderCommentText(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@")
      ? <span key={i} className="text-blue-600 font-medium">{part}</span>
      : part
  );
}
