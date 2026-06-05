import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { RequestStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { createNotification } from "@/lib/notify";
import { REQUEST_STATUS_LABELS } from "@/lib/utils";
import { deleteFile } from "@/lib/storage";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { requestUpdateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  const sessionUserId = session.user.id;
  const isAssigneeRole = role === "FOREMAN" || role === "ENGINEER";

  const { id } = await params;
  const request = await prisma.request.findFirst({
    where: {
      id,
      ...(isAssigneeRole ? { assigneeId: sessionUserId } : {}),
    },
    include: {
      client: true,
      assignee: true,
      items: { orderBy: { id: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, position: true } } },
      },
      changeLogs: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, position: true } } },
      },
      offers: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
      subtaskCategories: {
        where: { archivedAt: null },
        orderBy: { order: "asc" },
        include: {
          subtasks: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!request) throw notFound();
  return NextResponse.json(request);
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  const userId = session.user.id;

  const { id } = await params;
  const data = await parseBody(req, requestUpdateSchema);

  const old = await prisma.request.findUnique({ where: { id } });
  if (!old) throw notFound();

  const isAssigneeRole = role === "FOREMAN" || role === "ENGINEER";
  const isManager = role === "MANAGER";
  const isAdmin = role === "ADMIN";

  // FOREMAN/ENGINEER могут править только свои заявки
  if (isAssigneeRole && old.assigneeId !== userId) throw forbidden();

  // Блокировка: заявка «В работе» — MANAGER не может ничего менять.
  // ADMIN всегда может редактировать.
  if (!isAdmin && isManager && (old as any).lockedAt) {
    throw forbidden("Заявка заблокирована — статус «В работе». Изменения запрещены.");
  }

  // FOREMAN/ENGINEER могут менять только производственные статусы.
  const PRODUCTION_FIELDS = new Set([
    "hasMetal", "metalOwner", "laserStatus", "bendingStatus", "weldingStatus",
    "paintingStatus", "sandblastingStatus", "extraWorkStatus", "deliveryStatus",
  ]);
  const allowedData: Record<string, unknown> = isAssigneeRole
    ? Object.fromEntries(Object.entries(data).filter(([k]) => PRODUCTION_FIELDS.has(k)))
    : { ...data };

  // Авто-блокировка: переход в IN_PROGRESS → lockedAt = now().
  // Снятие блокировки: ADMIN меняет статус обратно → lockedAt = null.
  if ("status" in allowedData) {
    if (allowedData.status === "IN_PROGRESS" && !(old as any).lockedAt) {
      allowedData.lockedAt = new Date();
    } else if (allowedData.status !== "IN_PROGRESS" && (old as any).lockedAt) {
      allowedData.lockedAt = null;
    }
  }

  const updated = await prisma.request.update({
    where: { id },
    data: allowedData,
    include: { client: true, assignee: true },
  });

  if (old) {
    const tracked = ["status", "priority", "title", "assigneeId", "amount"] as const;
    for (const field of tracked) {
      const oldVal = String(old[field] ?? "");
      const newVal = String(updated[field] ?? "");
      if (oldVal !== newVal) {
        await prisma.changeLog.create({
          data: { requestId: id, userId, field, oldValue: oldVal, newValue: newVal },
        });
        if (field === "status") {
          await sendTelegram(
            `🔄 <b>Статус заявки #${updated.number} изменён</b>\n` +
            `📌 ${updated.title}\n` +
            `${REQUEST_STATUS_LABELS[oldVal as RequestStatus] ?? oldVal} → <b>${REQUEST_STATUS_LABELS[newVal as RequestStatus] ?? newVal}</b>`
          );
          if (updated.assigneeId && updated.assigneeId !== userId) {
            const oldLabel = REQUEST_STATUS_LABELS[oldVal as RequestStatus] ?? oldVal;
            const newLabel = REQUEST_STATUS_LABELS[newVal as RequestStatus] ?? newVal;
            await createNotification({
              userId: updated.assigneeId,
              type: "STATUS_CHANGED",
              title: `Статус заявки #${updated.number} изменён`,
              body: `${updated.title}: ${oldLabel} → ${newLabel}`,
              link: `/requests/${id}`,
            });
          }
        }
        if (field === "assigneeId" && newVal && newVal !== userId) {
          await createNotification({
            userId: newVal,
            type: "REQUEST_ASSIGNED",
            title: `Назначена заявка #${updated.number}`,
            body: updated.title,
            link: `/requests/${id}`,
          });
        }
      }
    }
  }

  return NextResponse.json(updated);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const { id } = await params;

  // Удаляем файлы из S3 до удаления записи (CASCADE чистит только БД, не S3)
  const files = await prisma.requestFile.findMany({ where: { requestId: id }, select: { filename: true } });
  await Promise.allSettled(files.map((f) => deleteFile(f.filename)));

  await prisma.request.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
