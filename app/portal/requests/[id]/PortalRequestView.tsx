"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check, Eye, Factory, FileText, FileSpreadsheet, Flag, MessageSquare, Package, Paperclip, Pencil, Trash2, Upload, Download } from "lucide-react";
import { FilePreviewModal, canPreviewFile, type PreviewFile } from "@/components/ui/file-preview-modal";
import { formatDate, PORTAL_PRODUCTION_FIELDS, PORTAL_PAYMENT_OPTIONS, PORTAL_PRIORITY_OPTIONS, type PortalPaymentStatus, type PortalPriority } from "@/lib/utils";
import { PortalItemsEditor } from "./PortalItemsEditor";
import { RequestSubtasksPanel } from "@/app/(dashboard)/requests/[id]/RequestSubtasksPanel";
import { uploadViaPresign } from "@/lib/upload-client";

type ProductionKey =
  | "laserStatus"
  | "bendingStatus"
  | "weldingStatus"
  | "paintingStatus"
  | "sandblastingStatus"
  | "extraWorkStatus"
  | "deliveryStatus";

type Item = { id: string; name: string; quantity: number; unit: string; price: number | null };
type Comment = {
  id: string;
  text: string;
  createdAt: Date | string;
  user: { id: string; name: string; role: string; avatarUrl: string | null };
};
type FileRec = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  kind: "DRAWING" | "DOCUMENT";
  createdAt: Date | string;
  uploadedById: string;
  uploadedBy: { id: string; name: string };
};
type Request = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: "NEW" | "IN_PROGRESS" | "READY";
  priority: PortalPriority;
  paymentStatus: PortalPaymentStatus;
  shippedAt: Date | string | null;
  acceptedAt: Date | string | null;
  finalizedAt: Date | string | null;
  createdByUserId: string;
  createdAt: Date | string;
  laserStatus: string | null;
  bendingStatus: string | null;
  weldingStatus: string | null;
  paintingStatus: string | null;
  sandblastingStatus: string | null;
  extraWorkStatus: string | null;
  deliveryStatus: string | null;
  items: Item[];
  comments: Comment[];
  files: FileRec[];
  subtaskCategories?: {
    id: string;
    name: string;
    archivedAt: Date | string | null;
    subtasks: { id: string; name: string; done: boolean; archivedAt: Date | string | null; order: number }[];
  }[];
};

const STATUS_LABELS = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  READY: "Готова",
} as const;
const STATUS_COLORS = {
  NEW: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
} as const;

type Position = { id: string; name: string; unit: string; price: number | null; folderId: string | null };
type FolderItem = { id: string; name: string };

export function PortalRequestView({
  request,
  currentUserId,
  positions,
  folders,
}: {
  request: Request;
  currentUserId: string;
  positions: Position[];
  folders: FolderItem[];
}) {
  const router = useRouter();

  // Отметка «Готова к работе» — клиент сам её ставит, когда закончил править.
  const [finalized, setFinalized] = useState<boolean>(request.finalizedAt != null);
  const [finalizedSaving, setFinalizedSaving] = useState(false);

  // Блокировка: заявка «В работе»/«Готова» (взял менеджер) ИЛИ клиент отметил
  // «Готова к работе» — в обоих случаях редактирование клиентом заморожено.
  const isLocked = request.status === "IN_PROGRESS" || request.status === "READY" || finalized;

  // Менеджер взял заявку в работу — клиент уже не может вернуть её в черновик.
  const finalizeLockedByManager = request.status === "IN_PROGRESS" || request.status === "READY";

  async function toggleFinalized() {
    const next = !finalized;
    setFinalizedSaving(true);
    try {
      const res = await fetch(`/api/portal/requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalized: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? `Не удалось сохранить (HTTP ${res.status})`);
        return;
      }
      setFinalized(next);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setFinalizedSaving(false);
    }
  }

  // ─── Производственные подстатусы ───────────────────────────────────────────
  // Клиент может корректировать их в любой момент: «забыли отметить покраску».
  // Сервер пишет только присланные ключи (см. PUT /api/portal/requests/[id]),
  // поэтому шлём по одному полю.
  const [production, setProduction] = useState<Record<ProductionKey, string | null>>({
    laserStatus: request.laserStatus,
    bendingStatus: request.bendingStatus,
    weldingStatus: request.weldingStatus,
    paintingStatus: request.paintingStatus,
    sandblastingStatus: request.sandblastingStatus,
    extraWorkStatus: request.extraWorkStatus,
    deliveryStatus: request.deliveryStatus,
  });

  const [prodError, setProdError] = useState<string | null>(null);

  async function updateProduction(key: ProductionKey, value: string | null) {
    const prev = production[key];
    setProduction((cur) => ({ ...cur, [key]: value }));
    setProdError(null);
    try {
      const res = await fetch(`/api/portal/requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        // Откатываем optimistic-обновление и показываем причину пользователю.
        // Часто это 500 от Prisma, если на проде миграция production-полей
        // ещё не накатилась (надо перезапустить pm2 metalcrm).
        const data = await res.json().catch(() => ({}));
        setProduction((cur) => ({ ...cur, [key]: prev }));
        setProdError(data?.error ?? `Не удалось сохранить (HTTP ${res.status})`);
        return;
      }
      // Серверный re-render: server component перечитает значения из БД и
      // подтвердит реальное сохранение (а не только локальный state).
      router.refresh();
    } catch (e) {
      setProduction((cur) => ({ ...cur, [key]: prev }));
      setProdError(e instanceof Error ? e.message : "Сетевая ошибка");
    }
  }

  // ─── Комментарии ───────────────────────────────────────────────────────────
  const [comments, setComments] = useState(request.comments);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // ─── Запрос изменений (для заблокированной заявки) ──────────────────────────
  const [changeReqOpen, setChangeReqOpen] = useState(false);
  const [changeReqText, setChangeReqText] = useState("");
  const [changeReqSending, setChangeReqSending] = useState(false);
  const [changeReqSent, setChangeReqSent] = useState(false);

  async function submitChangeRequest() {
    if (!changeReqText.trim() || changeReqSending) return;
    setChangeReqSending(true);
    try {
      const res = await fetch(`/api/portal/requests/${request.id}/change-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: changeReqText.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setComments((cur) => [...cur, created]);
        setChangeReqText("");
        setChangeReqOpen(false);
        setChangeReqSent(true);
      }
    } finally {
      setChangeReqSending(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || sendingComment) return;
    setSendingComment(true);
    const res = await fetch(`/api/portal/requests/${request.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: commentText.trim() }),
    });
    setSendingComment(false);
    if (res.ok) {
      const created = await res.json();
      setComments((cur) => [...cur, created]);
      setCommentText("");
    }
  }

  // ─── Файлы ─────────────────────────────────────────────────────────────────
  const [files, setFiles] = useState(request.files);
  const [uploading, setUploading] = useState(false);
  // Прогресс пакетной загрузки: сколько файлов уже залито из общего числа.
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Активная вкладка в едином блоке файлов: чертежи или документы.
  const [fileTab, setFileTab] = useState<"drawings" | "documents">("drawings");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: selected.length });
    // С клиента грузим только чертежи. Документы (kind=DOCUMENT) — прерогатива
    // менеджера; на сервере для CLIENT этот kind возвращает 400.
    // Грузим по очереди, чтобы показывать прогресс и не положить S3 пачкой.
    const failed: string[] = [];
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      try {
        const created = await uploadViaPresign<any>(
          `/api/portal/requests/${request.id}/files`,
          file,
          { kind: "DRAWING" }
        );
        setFiles((cur) => [...cur, created]);
      } catch (err) {
        failed.push(`${file.name}: ${err instanceof Error ? err.message : "ошибка"}`);
      }
      setUploadProgress({ done: i + 1, total: selected.length });
    }
    setUploading(false);
    setUploadProgress(null);
    if (failed.length > 0) {
      alert(`Не удалось загрузить ${failed.length} из ${selected.length}:\n${failed.join("\n")}`);
    }
  }

  // ─── Описание ──────────────────────────────────────────────────────────────
  // Менять может любой сотрудник кабинета компании, пока заявка не в работе.
  const canEditDescription = !isLocked;
  const [description, setDescription] = useState(request.description ?? "");
  const [descEditing, setDescEditing] = useState(false);
  const [descSaving, setDescSaving] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);

  async function saveDescription() {
    setDescSaving(true);
    setDescError(null);
    try {
      const res = await fetch(`/api/portal/requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDescError(data?.error ?? `Не удалось сохранить (HTTP ${res.status})`);
        return;
      }
      setDescEditing(false);
      router.refresh();
    } catch (err) {
      setDescError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setDescSaving(false);
    }
  }

  // ─── Название ────────────────────────────────────────────────────────────────
  // Менять может любой сотрудник кабинета компании, пока заявка не в работе.
  const canEditTitle = !isLocked;
  const [title, setTitle] = useState(request.title);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Название не может быть пустым");
      return;
    }
    setTitleSaving(true);
    setTitleError(null);
    try {
      const res = await fetch(`/api/portal/requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTitleError(data?.error ?? `Не удалось сохранить (HTTP ${res.status})`);
        return;
      }
      setTitleEditing(false);
      router.refresh();
    } catch (err) {
      setTitleError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setTitleSaving(false);
    }
  }

  const drawings = files.filter((f) => f.kind !== "DOCUMENT");
  const documents = files.filter((f) => f.kind === "DOCUMENT");

  const [downloading, setDownloading] = useState(false);

  async function downloadAllFiles() {
    if (files.length === 0) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/portal/requests/${request.id}/files/zip`, { method: "POST" });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zaявка-${request.number}-файлы.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const [priority, setPriorityState] = useState<PortalPriority>(request.priority);
  const paymentOpt = PORTAL_PAYMENT_OPTIONS.find((o) => o.value === request.paymentStatus) ?? PORTAL_PAYMENT_OPTIONS[0];
  const priorityOpt = PORTAL_PRIORITY_OPTIONS.find((o) => o.value === priority) ?? PORTAL_PRIORITY_OPTIONS[1];

  async function updatePriority(next: PortalPriority) {
    const prev = priority;
    setPriorityState(next);
    const res = await fetch(`/api/portal/requests/${request.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: next }),
    });
    if (!res.ok) setPriorityState(prev);
    else router.refresh();
  }

  // ─── Принято (ставит клиент) ──────────────────────────────────────────────
  const [accepted, setAccepted] = useState<boolean>(request.acceptedAt != null);
  const [acceptedSaving, setAcceptedSaving] = useState(false);
  const shipped = request.shippedAt != null;

  async function toggleAccepted() {
    const next = !accepted;
    setAccepted(next);
    setAcceptedSaving(true);
    const res = await fetch(`/api/portal/requests/${request.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accepted: next }),
    });
    setAcceptedSaving(false);
    if (!res.ok) {
      setAccepted(!next);
      return;
    }
    router.refresh();
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm("Удалить файл?")) return;
    const res = await fetch(`/api/portal/requests/${request.id}/files/${fileId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setFiles((cur) => cur.filter((f) => f.id !== fileId));
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> К списку
      </Link>

      {/* Клиент сам заморозил заявку («Готова к работе», но менеджер ещё не взял) —
          может вернуть в черновик сам, без обращения к менеджеру. */}
      {isLocked && !finalizeLockedByManager && finalized && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex flex-wrap items-center gap-2">
            <Flag className="h-4 w-4 shrink-0" />
            <span className="flex-1 min-w-0">
              Заявка отмечена как <strong>«Готова к работе»</strong> — редактирование заморожено,
              менеджер видит, что её можно брать. Чтобы снова внести правки — верните в черновик.
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 shrink-0"
              onClick={toggleFinalized}
              disabled={finalizedSaving}
            >
              {finalizedSaving ? "..." : "Вернуть в черновик"}
            </Button>
          </div>
        </div>
      )}

      {isLocked && finalizeLockedByManager && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base">🔒</span>
            <span className="flex-1 min-w-0">
              Заявка <strong>{STATUS_LABELS[request.status]}</strong> — редактирование заблокировано.
              Обратитесь к менеджеру, если нужно внести изменения.
            </span>
            {changeReqSent ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Запрос отправлен
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100 shrink-0"
                onClick={() => setChangeReqOpen((v) => !v)}
              >
                Запросить изменения
              </Button>
            )}
          </div>
          {changeReqOpen && !changeReqSent && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={changeReqText}
                onChange={(e) => setChangeReqText(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Опишите, что нужно изменить в заявке — менеджер получит уведомление."
                className="bg-white"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => { setChangeReqOpen(false); setChangeReqText(""); }}
                  disabled={changeReqSending}
                >
                  Отмена
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={submitChangeRequest}
                  disabled={changeReqSending || !changeReqText.trim()}
                >
                  {changeReqSending ? "Отправка..." : "Отправить менеджеру"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">Заявка #{request.number} · {formatDate(request.createdAt)}</p>
            {titleEditing ? (
              <div className="mt-1 space-y-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={500}
                  placeholder="Название заявки"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
                    if (e.key === "Escape") { setTitle(request.title); setTitleEditing(false); setTitleError(null); }
                  }}
                />
                {titleError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {titleError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={saveTitle} disabled={titleSaving}>
                    {titleSaving ? "Сохранение..." : "Сохранить"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setTitle(request.title); setTitleEditing(false); setTitleError(null); }}
                    disabled={titleSaving}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <div className="group/title mt-0.5 flex items-start gap-1.5">
                <h1 className="text-lg font-semibold text-slate-900">{request.title}</h1>
                {canEditTitle && (
                  <button
                    type="button"
                    onClick={() => { setTitle(request.title); setTitleEditing(true); }}
                    className="mt-1 rounded p-1 text-slate-400 opacity-0 group-hover/title:opacity-100 hover:bg-slate-100 hover:text-slate-700 transition-opacity"
                    title="Редактировать название"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Оплата — только менеджер выставляет, клиент видит как read-only бейдж */}
            {request.paymentStatus !== "NONE" && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${paymentOpt.className}`}>
                {paymentOpt.label}
              </span>
            )}

            {/* Отгружено — ставит только менеджер (read-only бейдж для клиента). */}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                shipped
                  ? "bg-sky-100 text-sky-700"
                  : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
              }`}
              title={
                shipped
                  ? `Отгружено ${formatDate(request.shippedAt!)}`
                  : "Менеджер ещё не отметил отгрузку"
              }
            >
              <Package className="h-3 w-3" />
              {shipped ? "Отгружено" : "Не отгружено"}
            </span>

            {/* Готова к работе — клиент сам отмечает, что закончил редактировать.
                Пока «Черновик» — правит свободно; «Готова к работе» — заморожено.
                Снять отметку нельзя, если менеджер уже взял заявку в работу. */}
            <button
              type="button"
              onClick={toggleFinalized}
              disabled={finalizedSaving || finalizeLockedByManager}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                finalized
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
              } disabled:opacity-60`}
              title={
                finalizeLockedByManager
                  ? "Заявка уже в работе у менеджера"
                  : finalized
                    ? "Готова к работе. Нажмите, чтобы вернуть в черновик и отредактировать."
                    : "Нажмите, когда закончите редактировать — менеджер увидит, что заявку можно брать."
              }
            >
              <Flag className="h-3 w-3" />
              {finalized ? "Готова к работе" : "Черновик"}
            </button>

            {/* Принято — ставит ответственный в кабинете клиента (toggle). */}
            <button
              type="button"
              onClick={toggleAccepted}
              disabled={acceptedSaving}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                accepted
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"
              } disabled:opacity-60`}
              title={
                accepted
                  ? `Принято ${formatDate(request.acceptedAt!)}. Нажмите, чтобы снять.`
                  : "Отметить как принято"
              }
            >
              <Check className="h-3 w-3" />
              {accepted ? "Принято" : "Не принято"}
            </button>

            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[request.status]}`}>
              {STATUS_LABELS[request.status]}
            </span>

            {/* Приоритет — read-only когда заблокировано */}
            {isLocked ? (
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${priorityOpt.className}`}>
                {priorityOpt.label}
              </span>
            ) : (
              <Select value={priority} onValueChange={(v) => updatePriority(v as PortalPriority)}>
                <SelectTrigger className={`h-7 w-auto min-w-28 px-2.5 text-xs rounded-full font-medium border-0 shadow-none ${priorityOpt.className}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTAL_PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {descEditing ? (
          <div className="space-y-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="Описание заявки"
            />
            {descError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {descError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDescription(request.description ?? "");
                  setDescEditing(false);
                  setDescError(null);
                }}
                disabled={descSaving}
              >
                Отмена
              </Button>
              <Button type="button" size="sm" onClick={saveDescription} disabled={descSaving}>
                {descSaving ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        ) : description ? (
          <div className="group rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap relative">
            {description}
            {canEditDescription && (
              <button
                type="button"
                onClick={() => setDescEditing(true)}
                className="absolute right-2 top-2 rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-slate-700 transition-opacity"
                title="Редактировать"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : canEditDescription ? (
          <button
            type="button"
            onClick={() => setDescEditing(true)}
            className="text-sm text-slate-400 hover:text-orange-600 inline-flex items-center gap-1"
          >
            <Pencil className="h-3 w-3" /> Добавить описание
          </button>
        ) : null}
      </div>

      {/* На lg+ контент разбит на две колонки: основная информация (производство,
          состав, файлы) слева, тред комментариев — справа. На мобилке всё
          выстраивается в один столбец, комментарии остаются внизу. */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">

      {/* Производство — клиент сам отмечает, какие операции нужны. Можно
          менять в любой момент: PUT /api/portal/requests/[id] принимает
          production-поля от CLIENT (см. portalRequestUpdateSchema). */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Factory className="h-4 w-4 text-slate-400" /> Производство
        </h3>
        {prodError && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {prodError}
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PORTAL_PRODUCTION_FIELDS.map((f) => {
            const key = f.key as ProductionKey;
            const current = production[key];
            const opt = current ? f.options.find((o) => o.value === current) : null;
            return (
              <div key={f.key} className="space-y-1">
                <p className="text-xs font-medium text-slate-500">{f.label}</p>
                <Select
                  value={current ?? "__none__"}
                  onValueChange={(v) => updateProduction(key, v === "__none__" ? null : v)}
                  disabled={isLocked}
                >
                  <SelectTrigger
                    className={`h-8 w-full px-2.5 text-xs rounded-full font-medium border-0 shadow-none ${
                      opt ? opt.className : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
                    }`}
                  >
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">—</SelectItem>
                    {f.options.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </section>

      {/* Подзадачи — пользователи ЛК ведут их сами (категории → подзадачи).
          В админ-виде блок называется так же, чтобы не путать клиента и менеджера. */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Check className="h-4 w-4 text-slate-400" /> Подзадачи
        </h3>
        <RequestSubtasksPanel
          requestId={request.id}
          apiBase={`/api/portal/requests/${request.id}`}
          readOnly={isLocked}
          initialCategories={(request.subtaskCategories ?? []).map((cat) => ({
            id: cat.id,
            name: cat.name,
            archivedAt: cat.archivedAt ? String(cat.archivedAt) : null,
            subtasks: cat.subtasks.map((s) => ({
              id: s.id,
              name: s.name,
              done: s.done,
              archivedAt: s.archivedAt ? String(s.archivedAt) : null,
              order: s.order,
            })),
          }))}
        />
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileText className="h-4 w-4 text-slate-400" /> Состав ({request.items.length})
        </h3>
        <PortalItemsEditor
          requestId={request.id}
          initialItems={request.items}
          positions={positions}
          folders={folders}
          readOnly={isLocked}
        />
      </section>

      {/* Чертежи и документы — один блок с табами. Чертежи грузит клиент,
          документы (счета/договоры) только скачивает: менеджер загружает их
          на админской стороне. */}
      <section>
        <div className="mb-2 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFileTab("drawings")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                fileTab === "drawings"
                  ? "border-orange-500 text-orange-600 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Paperclip className="h-4 w-4" /> Чертежи ({drawings.length})
            </button>
            <button
              type="button"
              onClick={() => setFileTab("documents")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                fileTab === "documents"
                  ? "border-orange-500 text-orange-600 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" /> Документы ({documents.length})
            </button>
          </div>
          {files.length > 0 && (
            <button
              type="button"
              onClick={downloadAllFiles}
              disabled={downloading}
              className="mb-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              title="Скачать все файлы архивом"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? "Загрузка…" : "Скачать всё"}
            </button>
          )}
        </div>

        {fileTab === "drawings" ? (
          <div className="space-y-2">
            {drawings.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
                Чертежей пока нет
              </div>
            ) : (
              <ul className="space-y-1.5">
                {drawings.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {canPreviewFile(f.originalName) ? (
                      <button
                        type="button"
                        onClick={() => setPreviewFile({ key: f.filename, name: f.originalName })}
                        className="truncate text-left text-slate-700 hover:text-orange-600"
                        title="Предпросмотр"
                      >
                        {f.originalName}
                      </button>
                    ) : (
                      <a
                        href={`/api/files?key=${encodeURIComponent(f.filename)}&name=${encodeURIComponent(f.originalName)}`}
                        className="truncate text-slate-700 hover:text-orange-600"
                      >
                        {f.originalName}
                      </a>
                    )}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} КБ</span>
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
                      {f.uploadedById === currentUserId && !isLocked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(f.id)}
                          className="text-red-500 hover:text-red-600"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!isLocked && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-1 h-4 w-4" />{" "}
                  {uploading
                    ? uploadProgress
                      ? `Загрузка ${uploadProgress.done} из ${uploadProgress.total}...`
                      : "Загрузка..."
                    : "Прикрепить чертежи"}
                </Button>
              </>
            )}
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
            Документов пока нет
          </div>
        ) : (
          <ul className="space-y-1.5">
            {documents.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {canPreviewFile(f.originalName) ? (
                  <button
                    type="button"
                    onClick={() => setPreviewFile({ key: f.filename, name: f.originalName })}
                    className="truncate text-left text-slate-700 hover:text-orange-600"
                    title="Предпросмотр"
                  >
                    {f.originalName}
                  </button>
                ) : (
                  <a
                    href={`/api/files?key=${encodeURIComponent(f.filename)}&name=${encodeURIComponent(f.originalName)}`}
                    className="truncate text-slate-700 hover:text-orange-600"
                  >
                    {f.originalName}
                  </a>
                )}
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} КБ</span>
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
                  {f.uploadedById === currentUserId && !isLocked && (
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(f.id)}
                      className="text-red-500 hover:text-red-600"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

        </div>

        {/* Правая колонка: тред общения с менеджером. На lg+ становится sticky
            на уровне шапки страницы, чтобы при скролле состава/чертежей переписка
            всегда оставалась на виду. */}
        <section className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MessageSquare className="h-4 w-4 text-slate-400" /> Комментарии ({comments.length})
            </h3>
            <div className="space-y-2 mb-3 lg:max-h-[60vh] lg:overflow-y-auto lg:pr-1">
              {comments.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
                  Сообщений пока нет
                </div>
              ) : (
                <ul className="space-y-2">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name={c.user.name} src={c.user.avatarUrl} size={24} />
                        <span className="text-sm font-medium text-slate-800">{c.user.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {c.user.role === "CLIENT" ? "вы / клиент" : "менеджер"} · {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <form onSubmit={submitComment} className="space-y-2">
              <Textarea
                placeholder="Написать сообщение..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                maxLength={5000}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={!commentText.trim() || sendingComment}>
                  {sendingComment ? "Отправка..." : "Отправить"}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
