import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { withErrorHandling, parseBody, unauthorized, notFound } from "@/lib/api-handler";
import { commentSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  // FOREMAN/ENGINEER видят только свои заявки (по assigneeId)
  const isAssigneeRole = role === "FOREMAN" || role === "ENGINEER";
  const canSeeAll = role === "ADMIN" || role === "MANAGER";
  const request = await prisma.request.findFirst({
    where: canSeeAll
      ? { id }
      : isAssigneeRole
        ? { id, assigneeId: userId }
        : { id },
    select: { id: true, number: true, title: true },
  });
  if (!request) throw notFound();

  const { text } = await parseBody(req, commentSchema);

  const comment = await prisma.comment.create({
    data: { text, requestId: id, userId },
    include: { user: { select: { id: true, name: true, position: true } } },
  });

  await sendTelegram(
    `💬 <b>Комментарий к заявке #${request.number}</b>\n` +
    `📌 ${request.title}\n` +
    `👤 ${comment.user.name}: ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}`
  );

  return NextResponse.json(comment, { status: 201 });
});
