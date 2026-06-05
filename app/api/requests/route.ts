import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { RequestStatus, RequestPriority, PaymentStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { createNotification } from "@/lib/notify";
import { PRIORITY_LABELS, REQUEST_STATUS_LABELS } from "@/lib/utils";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { SAFETY_TAKE } from "@/lib/pagination";
import { requestCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const statusList = (searchParams.get("status") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const priority = searchParams.get("priority") ?? "";
  const paymentStatus = searchParams.get("paymentStatus") ?? "";
  const clientId = searchParams.get("clientId") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";
  const minimal = searchParams.get("minimal") === "true";
  const role = session.user.role;
  const userId = session.user.id;
  const isAssigneeRole = role === "FOREMAN" || role === "ENGINEER";
  const assigneeScope = isAssigneeRole ? { assigneeId: userId } : {};

  // Лёгкий режим для дропдаунов — только id, number, title, status
  if (minimal) {
    const requests = await prisma.request.findMany({
      where: assigneeScope,
      select: { id: true, number: true, title: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(requests);
  }

  const requests = await prisma.request.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { client: { name: { contains: search, mode: "insensitive" } } },
          ],
        } : {},
        statusList.length ? { status: { in: statusList as RequestStatus[] } } : {},
        priority ? { priority: priority as RequestPriority } : {},
        paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {},
        clientId ? { clientId } : {},
        assigneeId ? { assigneeId } : {},
        assigneeScope,
      ],
    },
    include: {
      client: { select: { id: true, name: true, shortName: true, type: true } },
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
    // Канбан-доска со счётчиками по статусам → не пагинируем,
    // но ограничиваем защитным потолком (см. docs/REMEDIATION.md, п.6).
    take: SAFETY_TAKE,
  });

  return NextResponse.json(requests);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") throw forbidden();

  const { items, ...data } = await parseBody(req, requestCreateSchema);

  const request = await prisma.request.create({
    data: {
      ...data,
      createdById: session.user.id,
      items: items?.length
        ? { create: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            discount: item.discount,
            total: item.total,
            isCustomerMaterial: item.isCustomerMaterial,
          })) }
        : undefined,
    },
    include: { client: true, assignee: true, items: true },
  });

  await sendTelegram(
    `📋 <b>Новая заявка #${request.number}</b>\n` +
    `📌 ${request.title}\n` +
    `🏢 Клиент: ${request.client?.name ?? "—"}\n` +
    `⚡ Приоритет: ${PRIORITY_LABELS[request.priority]}\n` +
    `👤 Ответственный: ${request.assignee?.name ?? "Не назначен"}`
  );

  const currentUserId = session.user.id as string | undefined;
  if (request.assigneeId && request.assigneeId !== currentUserId) {
    await createNotification({
      userId: request.assigneeId,
      type: "REQUEST_ASSIGNED",
      title: `Назначена заявка #${request.number}`,
      body: request.title,
      link: `/requests/${request.id}`,
    });
  }

  return NextResponse.json(request, { status: 201 });
});
