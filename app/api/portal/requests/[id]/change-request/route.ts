import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";
import { notifyPortalChangeRequest } from "@/lib/notify";

const schema = z.object({ text: z.string().trim().min(1).max(2000) });

/**
 * Запрос изменений от клиента по заблокированной заявке.
 * Доступно только CLIENT (внутренние правят заявку напрямую).
 * Пишет сообщение в общий тред + шлёт уведомление менеджеру/админам.
 */
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "CLIENT") throw forbidden("Только для пользователей кабинета");

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const { text } = await parseBody(req, schema);

  const request = await prisma.portalRequest.findUnique({
    where: { id },
    select: {
      number: true,
      title: true,
      companyId: true,
      company: { select: { name: true } },
    },
  });
  if (!request) throw notFound();

  const comment = await prisma.portalComment.create({
    data: { text: `🔧 Запрос на изменение: ${text}`, portalRequestId: id, userId: session.user.id },
    include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
  });

  notifyPortalChangeRequest({
    requestId: id,
    requestNumber: request.number,
    requestTitle: request.title,
    companyId: request.companyId,
    companyName: request.company.name,
    fromUserId: session.user.id,
    fromUserName: session.user.name ?? "Клиент",
    message: text,
  }).catch(() => {});

  return NextResponse.json(comment, { status: 201 });
});
