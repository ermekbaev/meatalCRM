import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendToChat(chatId: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

/**
 * Sends a Telegram notification to all internal users who have a telegramChatId set.
 *
 * CLIENT-роль (пользователи кабинета портала) исключена сознательно: это внешние
 * пользователи компаний, им не должны прилетать общие CRM-уведомления о заявках,
 * статусах и комментариях во внутреннем флоу.
 */
export async function sendTelegram(text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    const users = await prisma.user.findMany({
      where: {
        telegramChatId: { not: null },
        isBlocked: false,
        role: { not: "CLIENT" },
      },
      select: { telegramChatId: true },
    });
    await Promise.all(
      users.map((u) => sendToChat(u.telegramChatId!, text).catch(() => {}))
    );
  } catch {}
}

/** Sends a Telegram notification to a specific list of chat IDs (e.g. assignee only). */
export async function sendTelegramTo(chatIds: string[], text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await Promise.all(chatIds.map((id) => sendToChat(id, text).catch(() => {})));
  } catch {}
}
