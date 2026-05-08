import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";
import { sendPushToUser } from "./push";

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
