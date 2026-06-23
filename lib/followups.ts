import { prisma } from "./prisma";
import { createNotification } from "./notify";

/**
 * Находит наступившие/просроченные напоминания (PENDING, срок ≤ сейчас, ещё не
 * уведомляли) и шлёт пуш + уведомление ответственному. Идемпотентно через
 * `notifiedAt`, поэтому повторные вызовы не дублируют пуши.
 *
 * Вызывается двумя путями (проект сознательно избегает обязательного крона):
 *  - лениво при опросе счётчика сайдбара (`/api/followups/count`);
 *  - из защищённого крон-эндпоинта (`/api/cron/followups-due`), если настроен
 *    внешний планировщик.
 *
 * Возвращает число отправленных уведомлений.
 */
export async function dispatchDueFollowupNotifications(): Promise<number> {
  const now = new Date();
  const due = await prisma.followUp.findMany({
    where: {
      status: "PENDING",
      dueDate: { lte: now },
      notifiedAt: null,
      assigneeId: { not: null },
    },
    select: {
      id: true,
      assigneeId: true,
      note: true,
      client: { select: { id: true, name: true, shortName: true, phone: true } },
    },
    take: 200,
  });
  if (due.length === 0) return 0;

  let sent = 0;
  for (const f of due) {
    const clientName = f.client.shortName || f.client.name;
    const body = [f.client.phone, f.note].filter(Boolean).join(" · ");
    await createNotification({
      userId: f.assigneeId!,
      type: "FOLLOWUP_DUE",
      title: `Пора позвонить: ${clientName}`,
      body: body || null,
      link: `/clients/${f.client.id}`,
    });
    await prisma.followUp.update({
      where: { id: f.id },
      data: { notifiedAt: new Date() },
    });
    sent++;
  }
  return sent;
}
