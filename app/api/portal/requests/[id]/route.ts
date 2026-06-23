import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, notFound, forbidden } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";
import { portalRequestUpdateSchema } from "@/lib/validation";
import { deleteFile } from "@/lib/storage";

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
 *   - finalized     — отметка «Готова к работе»: ставит клиент, когда закончил
 *                     редактировать; замораживает его правки (можно снять и вернуться).
 *   - production    — клиент и менеджер.
 *   - title/description — клиент и менеджер, но только пока заявка не в работе
 *                     (общий `isLocked`-чек выше замораживает их при IN_PROGRESS/READY).
 */
export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const data = await parseBody(req, portalRequestUpdateSchema);
  const isClient = session.user.role === "CLIENT";

  // Блокировка клиента: при статусе IN_PROGRESS/READY или после собственной
  // отметки «Готова к работе» (finalizedAt) клиент не может ничего редактировать,
  // кроме отметки «Принято» (acceptedAt) и переключения «Готова к работе»
  // (finalized) — последнее нужно, чтобы вернуться к черновику и снова править.
  if (isClient) {
    const current = await prisma.portalRequest.findUnique({
      where: { id },
      select: { status: true, finalizedAt: true },
    });
    const locked =
      current?.status === "IN_PROGRESS" ||
      current?.status === "READY" ||
      current?.finalizedAt != null;
    const onlyToggles = Object.keys(data).every((k) => k === "accepted" || k === "finalized");
    if (locked && !onlyToggles) {
      throw forbidden("Заявка в работе — редактирование недоступно");
    }
  }

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
  if (data.title !== undefined) patch.title = data.title;
  if (data.status !== undefined) patch.status = data.status;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.paymentStatus !== undefined) patch.paymentStatus = data.paymentStatus;
  if (data.shipped !== undefined) patch.shippedAt = data.shipped ? new Date() : null;
  if (data.accepted !== undefined) patch.acceptedAt = data.accepted ? new Date() : null;
  if (data.finalized !== undefined) patch.finalizedAt = data.finalized ? new Date() : null;
  if (data.description !== undefined) {
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
      title: true,
      status: true,
      priority: true,
      paymentStatus: true,
      shippedAt: true,
      acceptedAt: true,
      finalizedAt: true,
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

/**
 * Удаление портальной заявки — только ADMIN/MANAGER.
 * Перед удалением чистим S3-файлы, чтобы не оставлять orphaned objects.
 */
export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden("Удалить заявку может только менеджер или администратор");

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const files = await prisma.portalFile.findMany({
    where: { portalRequestId: id },
    select: { filename: true },
  });

  await prisma.portalRequest.delete({ where: { id } });

  for (const f of files) {
    await deleteFile(f.filename).catch(() => {});
  }

  return NextResponse.json({ ok: true });
});
