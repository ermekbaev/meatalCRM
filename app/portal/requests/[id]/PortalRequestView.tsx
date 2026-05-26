"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Factory, FileText, FileSpreadsheet, MessageSquare, Paperclip, Pencil, Trash2, Upload } from "lucide-react";
import { formatDate, PORTAL_PRODUCTION_FIELDS, PORTAL_PAYMENT_OPTIONS, type PortalPaymentStatus } from "@/lib/utils";
import { PortalItemsEditor } from "./PortalItemsEditor";

type ProductionKey =
  | "laserStatus"
  | "bendingStatus"
  | "weldingStatus"
  | "paintingStatus"
  | "sandblastingStatus"
  | "extraWorkStatus"
  | "deliveryStatus";

type Item = { id: string; name: string; quantity: number; unit: string };
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
  paymentStatus: PortalPaymentStatus;
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

type Position = { id: string; name: string; unit: string };

export function PortalRequestView({
  request,
  currentUserId,
  positions,
}: {
  request: Request;
  currentUserId: string;
  positions: Position[];
}) {
  const router = useRouter();

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    // С клиента грузим только чертежи. Документы (kind=DOCUMENT) — прерогатива
    // менеджера; на сервере для CLIENT этот kind возвращает 400.
    fd.append("kind", "DRAWING");
    const res = await fetch(`/api/portal/requests/${request.id}/files`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    e.target.value = "";
    if (res.ok) {
      const created = await res.json();
      setFiles((cur) => [...cur, created]);
    }
  }

  // ─── Описание ──────────────────────────────────────────────────────────────
  // Менять может только автор заявки. Остальные пользователи компании видят
  // как read-only (на случай нескольких CLIENT-юзеров в одном кабинете).
  const canEditDescription = request.createdByUserId === currentUserId;
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

  const drawings = files.filter((f) => f.kind !== "DOCUMENT");
  const documents = files.filter((f) => f.kind === "DOCUMENT");
  const paymentOpt = PORTAL_PAYMENT_OPTIONS.find((o) => o.value === request.paymentStatus) ?? PORTAL_PAYMENT_OPTIONS[0];

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
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> К списку
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-xs text-slate-400">Заявка #{request.number} · {formatDate(request.createdAt)}</p>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-900">{request.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paymentOpt.className}`}>
              {paymentOpt.label}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[request.status]}`}>
              {STATUS_LABELS[request.status]}
            </span>
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

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileText className="h-4 w-4 text-slate-400" /> Состав ({request.items.length})
        </h3>
        <PortalItemsEditor
          requestId={request.id}
          initialItems={request.items}
          positions={positions}
        />
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Paperclip className="h-4 w-4 text-slate-400" /> Чертежи ({drawings.length})
        </h3>
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
                  <a
                    href={`/api/files?key=${encodeURIComponent(f.filename)}&name=${encodeURIComponent(f.originalName)}`}
                    className="truncate text-slate-700 hover:text-orange-600"
                  >
                    {f.originalName}
                  </a>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)} КБ</span>
                    {f.uploadedById === currentUserId && (
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

          <input
            ref={fileInputRef}
            type="file"
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
            <Upload className="mr-1 h-4 w-4" /> {uploading ? "Загрузка..." : "Прикрепить чертёж"}
          </Button>
        </div>
      </section>

      {/* Документы от менеджера: счета, договоры, акты. Только скачивание —
          загружают и удаляют только внутренние роли (см. /api/portal/.../files). */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FileSpreadsheet className="h-4 w-4 text-slate-400" /> Документы ({documents.length})
        </h3>
        {documents.length === 0 ? (
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
                <a
                  href={`/api/files?key=${encodeURIComponent(f.filename)}&name=${encodeURIComponent(f.originalName)}`}
                  className="truncate text-slate-700 hover:text-orange-600"
                >
                  {f.originalName}
                </a>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {(f.size / 1024).toFixed(0)} КБ
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MessageSquare className="h-4 w-4 text-slate-400" /> Комментарии ({comments.length})
        </h3>
        <div className="space-y-2 mb-3">
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
      </section>
    </div>
  );
}
