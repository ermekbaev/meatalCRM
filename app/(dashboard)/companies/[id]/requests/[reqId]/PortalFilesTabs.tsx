"use client";
import { useState } from "react";
import { FileSpreadsheet, Paperclip } from "lucide-react";
import { PortalDocumentsSection } from "./PortalDocumentsSection";

type FileRec = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  uploadedBy: { id: string; name: string };
};

/**
 * Объединённый блок «Чертежи / Документы» для админ-страницы заявки.
 * Чертежи read-only (их грузит клиент в кабинете), документы загружает
 * и удаляет внутренний пользователь через PortalDocumentsSection.
 * Визуально совпадает с табами в клиентском кабинете.
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
  const [tab, setTab] = useState<"drawings" | "documents">("drawings");

  return (
    <section>
      <div className="mb-2 flex items-center gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("drawings")}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === "drawings"
              ? "border-orange-500 text-orange-600 font-medium"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Paperclip className="h-4 w-4" /> Чертежи ({drawings.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("documents")}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === "documents"
              ? "border-orange-500 text-orange-600 font-medium"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" /> Документы ({documents.length})
        </button>
      </div>

      {tab === "drawings" ? (
        drawings.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400 text-center">
            Чертежей нет
          </div>
        ) : (
          <ul className="space-y-1.5">
            {drawings.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <a
                  href={`/api/files?key=${encodeURIComponent(f.filename)}&name=${encodeURIComponent(f.originalName)}`}
                  className="truncate text-slate-700 hover:text-orange-600"
                >
                  {f.originalName}
                </a>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {(f.size / 1024).toFixed(0)} КБ · {f.uploadedBy.name}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <PortalDocumentsSection requestId={requestId} initial={documents} />
      )}
    </section>
  );
}
