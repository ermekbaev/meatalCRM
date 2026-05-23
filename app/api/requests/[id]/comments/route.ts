import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { withErrorHandling, parseBody, unauthorized } from "@/lib/api-handler";
import { commentSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const { text } = await parseBody(req, commentSchema);
  const userId = session.user.id;

  const comment = await prisma.comment.create({
    data: { text, requestId: id, userId },
    include: { user: { select: { id: true, name: true, position: true } } },
  });

  const request = await prisma.request.findUnique({ where: { id }, select: { number: true, title: true } });
  if (request) {
    await sendTelegram(
      `💬 <b>Комментарий к заявке #${request.number}</b>\n` +
      `📌 ${request.title}\n` +
      `👤 ${comment.user.name}: ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}`
    );
  }

  return NextResponse.json(comment, { status: 201 });
});
