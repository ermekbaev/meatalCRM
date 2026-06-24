"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilePreviewModal, type PreviewFile } from "@/components/ui/file-preview-modal";
import { Download, Eye, Loader2 } from "lucide-react";
import type { PdfOutput } from "@/lib/pdf-types";

/**
 * Кнопки «Просмотр» + «Скачать» для любого генерируемого PDF + общая модалка
 * предпросмотра. `generate(mode)` должен вернуть blob-URL при mode==="bloburl"
 * (для превью) и скачать файл при mode==="save". См. lib/*-pdf.ts.
 */
export function PdfDocButtons({
  filename,
  generate,
  disabled,
  size = "default",
  variant = "outline",
  className,
  preview = true,
  download = true,
  previewLabel = "Просмотр",
  downloadLabel = "Скачать PDF",
  downloadIcon,
}: {
  filename: string;
  generate: (mode: PdfOutput) => Promise<string | void>;
  disabled?: boolean;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  preview?: boolean;
  download?: boolean;
  previewLabel?: string;
  downloadLabel?: string;
  downloadIcon?: ReactNode;
}) {
  const [busy, setBusy] = useState<null | "preview" | "save">(null);
  const [file, setFile] = useState<PreviewFile | null>(null);

  const run = async (mode: PdfOutput) => {
    setBusy(mode === "bloburl" ? "preview" : "save");
    try {
      const res = await generate(mode);
      if (mode === "bloburl" && typeof res === "string") {
        setFile({ name: filename, url: res, mimeType: "application/pdf" });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {preview && (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          disabled={disabled || busy !== null}
          onClick={() => run("bloburl")}
        >
          {busy === "preview" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
          {previewLabel}
        </Button>
      )}
      {download && (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          disabled={disabled || busy !== null}
          onClick={() => run("save")}
        >
          {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (downloadIcon ?? <Download className="mr-2 h-4 w-4" />)}
          {downloadLabel}
        </Button>
      )}
      <FilePreviewModal file={file} onClose={() => setFile(null)} />
    </>
  );
}
