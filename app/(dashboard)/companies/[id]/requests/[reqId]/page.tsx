import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Factory, FileText, FileSpreadsheet, MessageSquare, Paperclip } from "lucide-react";
import { formatDate, PORTAL_PRODUCTION_FIELDS } from "@/lib/utils";
import { PortalStatusPicker } from "./PortalStatusPicker";
import { PortalPaymentPicker } from "./PortalPaymentPicker";
import { PortalCommentForm } from "./PortalCommentForm";
import { PortalDescriptionEditor } from "./PortalDescriptionEditor";
import { PortalDocumentsSection } from "./PortalDocumentsSection";

export default async function PortalRequestViewPage({
  params,
}: {
  params: Promise<{ id: string; reqId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/dashboard");

  const { id, reqId } = await params;

  // Проверяем доступ к компании через тот же фильтр (manager видит только свои).
  const company = await prisma.client.findFirst({
    where: {
      id,
      isPortalEnabled: true,
      ...(role === "MANAGER" ? { managerId: session.user.id } : {}),
    },
    select: { id: true, name: true },
  });
  if (!company) notFound();

  const request = await prisma.portalRequest.findFirst({
    where: { id: reqId, companyId: id },
    include: {
      createdByUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
      items: { orderBy: { name: "asc" } },
      comments: {
        include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      files: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!request) notFound();

  // Первое открытие заявки внутренним пользователем — гасит бейдж «новая»
  // в списке компаний и сайдбаре. updateMany с фильтром на null делает это
  // транзакционно: если кто-то открыл заявку параллельно, мы просто не запишем.
  // revalidatePath инвалидирует серверный кэш списка компаний, чтобы при
  // возврате назад счётчик уже был свежим (сайдбар обновится сам на следующем polling).
  if (request.firstViewedAt === null) {
    await prisma.portalRequest.updateMany({
      where: { id: reqId, firstViewedAt: null },
      data: { firstViewedAt: new Date() },
    });
    revalidatePath("/companies");
    revalidatePath(`/companies/${id}`);
  }

  return (
    <div>
      <Header
        title={`Заявка #${request.number}`}
        subtitle={`Кабинет «${company.name}»`}
      />
      <div className="p-4 lg:p-6 space-y-6">
        <Link
          href={`/companies/${company.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> К компании
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{request.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                от {request.createdByUser.name} · {formatDate(request.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PortalPaymentPicker requestId={request.id} initial={request.paymentStatus} />
              <PortalStatusPicker requestId={request.id} initial={request.status} />
            </div>
          </div>
          <PortalDescriptionEditor requestId={request.id} initial={request.description} />
        </div>

        {/* Ручной перенос в основную CRM.
            Сознательно НЕ автозаполняем title/позиции/описание — только preselect
            контрагента в форме. Менеджер сам копирует, что нужно, и нормализует
            «как принято в CRM» (приоритет, цены, ответственный, статусы цехов).
            См. docs/client-portal-plan.md — вариант А. */}
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Ручной перенос в CRM</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Заявка не переносится автоматически. Откройте форму новой заявки CRM
                и заполните её на основе этих данных — контрагент будет выбран заранее.
              </p>
            </div>
            <Link href={`/requests/new?clientId=${company.id}`}>
              <Button size="sm" variant="outline">
                Создать заявку в CRM <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Производство — клиент сам отметил, какие операции ему нужны.
            Здесь это read-only пометки: финальные производственные статусы
            ставятся уже в CRM-заявке после ручного переноса. */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Factory className="h-4 w-4 text-slate-400" /> Производство (от клиента)
          </h3>
          <div className="rounded-xl border border-gray-200 bg-white p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PORTAL_PRODUCTION_FIELDS.map((f) => {
              const current = (request as unknown as Record<string, string | null>)[f.key];
              const opt = current ? f.options.find((o) => o.value === current) : null;
              return (
                <div key={f.key} className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">{f.label}</p>
                  {opt ? (
                    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${opt.className}`}>
                      {opt.label}
                    </span>
                  ) : (
                    <span className="inline-flex h-6 items-center rounded-full bg-slate-50 px-2.5 text-xs font-medium text-slate-400 ring-1 ring-slate-200">
                      —
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Позиции */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-slate-400" /> Позиции ({request.items.length})
          </h3>
          {request.items.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400 text-center">
              Позиции не указаны
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {request.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-800">{it.name}</span>
                    <span className="text-sm text-slate-600 whitespace-nowrap">
                      {it.quantity} {it.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Чертежи и файлы клиента (kind=DRAWING) — read-only для менеджера. */}
        {(() => {
          const drawings = request.files.filter((f) => f.kind === "DRAWING");
          const documents = request.files.filter((f) => f.kind === "DOCUMENT");
          return (
            <>
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Paperclip className="h-4 w-4 text-slate-400" /> Чертежи ({drawings.length})
                </h3>
                {drawings.length === 0 ? (
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
                )}
              </section>

              {/* Документы (счета, договоры, акты) — загружает менеджер,
                  клиент только скачивает. */}
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FileSpreadsheet className="h-4 w-4 text-slate-400" /> Документы ({documents.length})
                </h3>
                <PortalDocumentsSection requestId={request.id} initial={documents} />
              </section>
            </>
          );
        })()}

        {/* Комментарии */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MessageSquare className="h-4 w-4 text-slate-400" /> Комментарии ({request.comments.length})
          </h3>
          {request.comments.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400 text-center mb-3">
              Комментариев нет
            </div>
          ) : (
            <ul className="space-y-2 mb-3">
              {request.comments.map((c) => (
                <li key={c.id} className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar name={c.user.name} src={c.user.avatarUrl} size={24} />
                    <span className="text-sm font-medium text-slate-800">{c.user.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {c.user.role === "CLIENT" ? "клиент" : "внутр."} · {formatDate(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.text}</p>
                </li>
              ))}
            </ul>
          )}
          <PortalCommentForm requestId={request.id} />
        </section>
      </div>
    </div>
  );
}
