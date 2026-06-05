import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { getPortalScope } from "@/lib/acl";
import { portalRequestCreateSchema } from "@/lib/validation";
import { notifyPortalRequestCreated } from "@/lib/notify";

/**
 * Список портальных заявок.
 *
 * CLIENT всегда видит только заявки своей компании — companyId берётся
 * из сессии (см. lib/acl.getPortalScope), любые поля из тела/query игнорируются.
 * Внутренние роли пользуются server-page `/companies/[id]`, поэтому здесь
 * для не-CLIENT возвращаем 403.
 */
export const GET = withErrorHandling(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const items = await prisma.portalRequest.findMany({
    where: { companyId },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      createdAt: true,
      _count: { select: { items: true, comments: true, files: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
});

/**
 * Создание новой портальной заявки.
 *
 * Источник истины для companyId / createdByUserId — сессия. Поля
 * из тела с тем же именем игнорируются по схеме (mass-assignment).
 * Контрагент клиентом не выбирается — он привязан к своей компании.
 * Уведомление PORTAL_REQUEST_CREATED админу+менеджеру отправляется
 * на следующем этапе через lib/notify.ts.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const data = await parseBody(req, portalRequestCreateSchema);

  const created = await prisma.portalRequest.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? "NORMAL",
      companyId,
      createdByUserId: session.user.id,
      laserStatus: data.laserStatus ?? null,
      bendingStatus: data.bendingStatus ?? null,
      weldingStatus: data.weldingStatus ?? null,
      paintingStatus: data.paintingStatus ?? null,
      sandblastingStatus: data.sandblastingStatus ?? null,
      extraWorkStatus: data.extraWorkStatus ?? null,
      deliveryStatus: data.deliveryStatus ?? null,
      items: data.items?.length
        ? {
            create: data.items.map((it) => ({
              name: it.name,
              quantity: it.quantity,
              unit: it.unit,
              price: it.price ?? null,
            })),
          }
        : undefined,
    },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      createdAt: true,
      company: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, name: true } },
      _count: { select: { items: true, comments: true, files: true } },
    },
  });

  // Уведомления админам + ответственному менеджеру (push в БД + Telegram).
  // Не await-им: уведомления не должны блокировать ответ клиенту.
  notifyPortalRequestCreated({
    requestId: created.id,
    requestNumber: created.number,
    requestTitle: created.title,
    companyId: created.company.id,
    companyName: created.company.name,
    createdByUserId: created.createdByUser.id,
    createdByUserName: created.createdByUser.name,
  }).catch(() => {});

  return NextResponse.json(created, { status: 201 });
});
