import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";
import { sendPushToUser } from "./push";
import { sendTelegramTo } from "./telegram";

type Payload = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function createNotification(p: Payload) {
  if (!p.userId) return null;
  try {
    const created = await prisma.notification.create({
      data: {
        userId: p.userId,
        type: p.type,
        title: p.title,
        body: p.body ?? null,
        link: p.link ?? null,
      },
    });
    sendPushToUser(p.userId, {
      title: p.title,
      body: p.body ?? "",
      link: p.link ?? "/",
    }).catch(() => {});
    return created;
  } catch {
    return null;
  }
}

export async function createNotifications(items: Payload[]) {
  const filtered = items.filter((i) => i.userId);
  if (filtered.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: filtered.map((p) => ({
        userId: p.userId,
        type: p.type,
        title: p.title,
        body: p.body ?? null,
        link: p.link ?? null,
      })),
    });
    // Push отправляем параллельно
    Promise.all(
      filtered.map((p) =>
        sendPushToUser(p.userId, {
          title: p.title,
          body: p.body ?? "",
          link: p.link ?? "/",
        }).catch(() => {})
      )
    ).catch(() => {});
  } catch {
    // молча игнорируем — уведомления не должны ронять основной сценарий
  }
}

/**
 * Адресная рассылка о новой портальной заявке: всем ADMIN и ответственному
 * менеджеру компании. Создаёт `Notification` в БД (это автоматически тригерит
 * push через `createNotifications`) и шлёт Telegram адресно — без широкой
 * рассылки `sendTelegram()`, чтобы не задеть мастеров/операторов.
 */
/**
 * Клиент из ЛК запросил изменения в заблокированной заявке.
 * Уведомляем админов + ответственного менеджера (БД + Telegram).
 */
export async function notifyPortalChangeRequest(args: {
  requestId: string;
  requestNumber: number;
  requestTitle: string;
  companyId: string;
  companyName: string;
  fromUserId: string;
  fromUserName: string;
  message: string;
}) {
  try {
    const [admins, company] = await Promise.all([
      prisma.user.findMany({
        where: { role: "ADMIN", isBlocked: false },
        select: { id: true, telegramChatId: true },
      }),
      prisma.client.findUnique({
        where: { id: args.companyId },
        select: { manager: { select: { id: true, isBlocked: true, telegramChatId: true } } },
      }),
    ]);

    const recipientIds = new Set<string>();
    for (const a of admins) recipientIds.add(a.id);
    if (company?.manager && !company.manager.isBlocked) recipientIds.add(company.manager.id);
    recipientIds.delete(args.fromUserId);

    const link = `/companies/${args.companyId}/requests/${args.requestId}`;
    const title = `Запрос изменений по заявке #${args.requestNumber}`;
    const body = `${args.fromUserName} (${args.companyName}): ${args.message}`;

    if (recipientIds.size > 0) {
      await createNotifications(
        Array.from(recipientIds).map((userId) => ({
          userId,
          type: "PORTAL_CHANGE_REQUEST",
          title,
          body,
          link,
        }))
      );
    }

    const chatIds: string[] = [];
    for (const a of admins) {
      if (a.telegramChatId && recipientIds.has(a.id)) chatIds.push(a.telegramChatId);
    }
    if (
      company?.manager &&
      company.manager.telegramChatId &&
      recipientIds.has(company.manager.id) &&
      !admins.some((a) => a.id === company.manager!.id)
    ) {
      chatIds.push(company.manager.telegramChatId);
    }

    if (chatIds.length > 0) {
      await sendTelegramTo(
        chatIds,
        `🔧 <b>Запрос изменений по заявке #${args.requestNumber}</b>\n` +
          `${args.requestTitle}\n` +
          `👤 ${args.fromUserName} (${args.companyName})\n\n` +
          `${args.message}`
      );
    }
  } catch {
    // Уведомления не должны ронять основной сценарий.
  }
}

export async function notifyPortalRequestCreated(args: {
  requestId: string;
  requestNumber: number;
  requestTitle: string;
  companyId: string;
  companyName: string;
  createdByUserId: string;
  createdByUserName: string;
}) {
  try {
    const [admins, company] = await Promise.all([
      prisma.user.findMany({
        where: { role: "ADMIN", isBlocked: false },
        select: { id: true, telegramChatId: true },
      }),
      prisma.client.findUnique({
        where: { id: args.companyId },
        select: {
          managerId: true,
          manager: { select: { id: true, isBlocked: true, telegramChatId: true } },
        },
      }),
    ]);

    // Собираем уникальный набор внутренних получателей: админы + менеджер компании.
    // Автор заявки (CLIENT) исключён — у CLIENT иной id, в списке его не будет,
    // но на всякий случай отфильтруем.
    const recipientIds = new Set<string>();
    for (const a of admins) recipientIds.add(a.id);
    if (company?.manager && !company.manager.isBlocked) {
      recipientIds.add(company.manager.id);
    }
    recipientIds.delete(args.createdByUserId);

    const link = `/companies/${args.companyId}/requests/${args.requestId}`;
    const title = `Новая заявка из кабинета «${args.companyName}»`;
    const body = `#${args.requestNumber} ${args.requestTitle} · от ${args.createdByUserName}`;

    if (recipientIds.size > 0) {
      await createNotifications(
        Array.from(recipientIds).map((userId) => ({
          userId,
          type: "PORTAL_REQUEST_CREATED",
          title,
          body,
          link,
        }))
      );
    }

    // Telegram — адресно тем же получателям (если у кого есть chatId).
    const chatIds: string[] = [];
    for (const a of admins) {
      if (a.telegramChatId && recipientIds.has(a.id)) chatIds.push(a.telegramChatId);
    }
    if (
      company?.manager &&
      company.manager.telegramChatId &&
      recipientIds.has(company.manager.id) &&
      !admins.some((a) => a.id === company.manager!.id) // не дублируем, если менеджер — админ
    ) {
      chatIds.push(company.manager.telegramChatId);
    }

    if (chatIds.length > 0) {
      await sendTelegramTo(
        chatIds,
        `📩 <b>Новая заявка из кабинета «${args.companyName}»</b>\n` +
          `#${args.requestNumber} ${args.requestTitle}\n` +
          `👤 ${args.createdByUserName}`
      );
    }
  } catch {
    // Уведомления не должны ронять основной сценарий.
  }
}
