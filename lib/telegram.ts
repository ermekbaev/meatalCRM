import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendToChat(chatId: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

/** Sends a Telegram notification to all users who have a telegramChatId set. */
export async function sendTelegram(text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    const users = await prisma.user.findMany({
      where: { telegramChatId: { not: null }, isBlocked: false },
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
