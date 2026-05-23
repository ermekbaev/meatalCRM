"use client";
import { File, FileText, Archive } from "lucide-react";

/** Иконка файла по MIME/расширению (вариант для страницы заявки — с `shrink-0`). */
export function getFileIcon(mimeType?: string, fileName?: string) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "dxf") return <File className="h-4 w-4 shrink-0 text-purple-400" />;
  if (ext === "rar" || ext === "zip") return <Archive className="h-4 w-4 shrink-0 text-yellow-500" />;
  if (!mimeType) return <FileText className="h-4 w-4 shrink-0 text-slate-400" />;
  if (mimeType.startsWith("image/")) return <FileText className="h-4 w-4 shrink-0 text-blue-400" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 shrink-0 text-red-400" />;
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed" || mimeType === "application/vnd.rar" || mimeType === "application/x-rar-compressed") return <Archive className="h-4 w-4 shrink-0 text-yellow-500" />;
  return <FileText className="h-4 w-4 shrink-0 text-slate-400" />;
}
