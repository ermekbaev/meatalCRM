import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, notFound, forbidden } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";
import { portalRequestUpdateSchema } from "@/lib/validation";

/**
 * Детали портальной заявки (позиции, файлы, общий тред комментариев).
 * Доступ — через `getPortalRequestAccess`: CLIENT → своя компания, ADMIN → все,
 * MANAGER → компании, где он `managerId`.
 */
export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const request = await prisma.portalRequest.findUnique({
    where: { id },
    include: {
      createdByUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
      company: { select: { id: true, name: true } },
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
  return NextResponse.json(request);
});

/**
 * Частичное обновление портальной заявки.
 *   - status        — только ADMIN/MANAGER.
 *   - paymentStatus — могут все (клиент тоже): фактическая оплата ведётся на стороне клиента.
 *   - shipped       — только ADMIN/MANAGER (отгрузку фиксирует менеджер).
 *   - accepted      — только CLIENT (ответственный в кабинете подтверждает приёмку).
 *   - production    — клиент и менеджер.
 */
export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const data = await parseBody(req, portalRequestUpdateSchema);
  const isClient = session.user.role === "CLIENT";

  if (data.status !== undefined && isClient) {
    throw forbidden("Сменить статус может только менеджер");
  }
  if (data.shipped !== undefined && isClient) {
    throw forbidden("Отметку «отгружено» ставит менеджер");
  }
  if (data.accepted !== undefined && !isClient) {
    throw forbidden("Отметку «принято» ставит ответственный в кабинете клиента");
  }

  // Собираем только присланные поля — не затираем то, чего нет в теле.
  const patch: Record<string, unknown> = {};
  if (data.status !== undefined) patch.status = data.status;
  if (data.paymentStatus !== undefined) patch.paymentStatus = data.paymentStatus;
  if (data.shipped !== undefined) patch.shippedAt = data.shipped ? new Date() : null;
  if (data.accepted !== undefined) patch.acceptedAt = data.accepted ? new Date() : null;
  if (data.description !== undefined) {
    // Пустая строка → null, чтобы UI единообразно показывал «нет описания».
    const trimmed = typeof data.description === "string" ? data.description.trim() : null;
    patch.description = trimmed ? trimmed : null;
  }
  for (const key of [
    "laserStatus",
    "bendingStatus",
    "weldingStatus",
    "paintingStatus",
    "sandblastingStatus",
    "extraWorkStatus",
    "deliveryStatus",
  ] as const) {
    if (data[key] !== undefined) patch[key] = data[key] ?? null;
  }

  const updated = await prisma.portalRequest.update({
    where: { id },
    data: patch,
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      shippedAt: true,
      acceptedAt: true,
      description: true,
      updatedAt: true,
      laserStatus: true,
      bendingStatus: true,
      weldingStatus: true,
      paintingStatus: true,
      sandblastingStatus: true,
      extraWorkStatus: true,
      deliveryStatus: true,
    },
  });
  return NextResponse.json(updated);
});
