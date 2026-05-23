import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramTo } from "@/lib/telegram";
import { createNotifications } from "@/lib/notify";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { commentSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role === "CONTRACTOR") throw forbidden();

  const { id } = await params;
  const { text } = await parseBody(req, commentSchema);
  const userId = session.user.id;
  const authorName = session.user.name ?? "Кто-то";

  const comment = await prisma.taskComment.create({
    data: { text, taskId: id, userId },
    include: { user: { select: { id: true, name: true, position: true, avatarUrl: true } } },
  });

  // Уведомления при упоминании @Имя
  const mentions = [...text.matchAll(/@([\wа-яёА-ЯЁ\s\-]+?)(?=\s|$|[^а-яёА-ЯЁ\w\-])/gu)]
    .map((m) => m[1].trim())
    .filter(Boolean);

  if (mentions.length > 0) {
    const task = await prisma.task.findUnique({ where: { id }, select: { title: true } });

    const mentionedUsers = await prisma.user.findMany({
      where: {
        name: { in: mentions },
        isBlocked: false,
        id: { not: userId },
      },
      select: { id: true, telegramChatId: true },
    });

    const chatIds = mentionedUsers.map((u) => u.telegramChatId).filter((c): c is string => Boolean(c));
    if (chatIds.length > 0) {
      const taskUrl = `Задача: ${task?.title ?? id}`;
      await sendTelegramTo(
        chatIds,
        `📌 <b>${authorName}</b> упомянул вас в комментарии\n${taskUrl}\n\n"${text}"`
      );
    }

    await createNotifications(
      mentionedUsers.map((u) => ({
        userId: u.id,
        type: "COMMENT_MENTION" as const,
        title: `${authorName} упомянул вас`,
        body: `${task?.title ? task.title + " · " : ""}${text.slice(0, 200)}`,
        link: `/tasks/${id}`,
      }))
    );
  }

  return NextResponse.json(comment, { status: 201 });
});
