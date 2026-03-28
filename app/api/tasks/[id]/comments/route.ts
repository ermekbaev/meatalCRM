import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramTo } from "@/lib/telegram";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Текст комментария не может быть пустым" }, { status: 400 });
  const userId = (session.user as any).id;
  const authorName = (session.user as any).name ?? "Кто-то";

  const comment = await prisma.taskComment.create({
    data: { text, taskId: id, userId },
    include: { user: { select: { id: true, name: true } } },
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
        telegramChatId: { not: null },
        isBlocked: false,
        id: { not: userId }, // не отправляем себе
      },
      select: { telegramChatId: true },
    });

    const chatIds = mentionedUsers.map((u) => u.telegramChatId!);
    if (chatIds.length > 0) {
      const taskUrl = `Задача: ${task?.title ?? id}`;
      await sendTelegramTo(
        chatIds,
        `📌 <b>${authorName}</b> упомянул вас в комментарии\n${taskUrl}\n\n"${text}"`
      );
    }
  }

  return NextResponse.json(comment, { status: 201 });
}
