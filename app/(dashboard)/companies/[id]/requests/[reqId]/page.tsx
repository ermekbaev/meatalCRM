import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Factory, FileText, MessageSquare } from "lucide-react";
import { formatDate, formatCurrency, PORTAL_PRODUCTION_FIELDS } from "@/lib/utils";
import { PortalStatusPicker } from "./PortalStatusPicker";
import { PortalPaymentPicker } from "./PortalPaymentPicker";
import { PortalShippedToggle } from "./PortalShippedToggle";
import { PortalCommentForm } from "./PortalCommentForm";
import { PortalDescriptionEditor } from "./PortalDescriptionEditor";
import { PortalFilesTabs } from "./PortalFilesTabs";
import { PortalTitleEditor } from "./PortalTitleEditor";
import { PortalDeleteButton } from "./PortalDeleteButton";

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
            <div className="min-w-0 flex-1">
              <PortalTitleEditor requestId={request.id} initial={request.title} />
              <p className="text-xs text-slate-500 mt-0.5">
                от {request.createdByUser.name} · {formatDate(request.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PortalPaymentPicker requestId={request.id} initial={request.paymentStatus} />
              <PortalShippedToggle requestId={request.id} initial={request.shippedAt != null} />
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                  request.acceptedAt
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
                }`}
                title={
                  request.acceptedAt
                    ? `Клиент принял ${formatDate(request.acceptedAt)}`
                    : "Клиент пока не отметил приёмку"
                }
              >
                <Check className="h-3 w-3" />
                {request.acceptedAt ? "Принято" : "Не принято"}
              </span>
              <PortalStatusPicker requestId={request.id} initial={request.status} />
              <PortalDeleteButton requestId={request.id} companyId={company.id} />
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
            (() => {
              const total = request.items.reduce(
                (sum, it) => (it.price == null ? sum : sum + it.price * it.quantity),
                0
              );
              return (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <ul className="divide-y divide-slate-100">
                    {request.items.map((it) => (
                      <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="text-sm text-slate-800 min-w-0 truncate">{it.name}</span>
                        <span className="text-sm text-slate-600 whitespace-nowrap">
                          {it.quantity} {it.unit}
                          {it.price != null && (
                            <>
                              {" · "}
                              <span className="text-slate-500">{formatCurrency(it.price)}</span>
                              {" = "}
                              <span className="font-medium text-slate-800">
                                {formatCurrency(it.price * it.quantity)}
                              </span>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {total > 0 && (
                    <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                      Итого: <span className="ml-1 font-medium text-slate-900">{formatCurrency(total)}</span>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </section>

        {/* Чертежи (от клиента, read-only) и документы (грузит менеджер) —
            один блок с табами, как в клиентском кабинете. */}
        <PortalFilesTabs
          requestId={request.id}
          drawings={request.files.filter((f) => f.kind === "DRAWING")}
          documents={request.files.filter((f) => f.kind === "DOCUMENT")}
        />

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
