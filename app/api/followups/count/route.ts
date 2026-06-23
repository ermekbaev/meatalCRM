import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized } from "@/lib/api-handler";
import { isAdminOrManager, type Role } from "@/lib/acl";
import { dispatchDueFollowupNotifications } from "@/lib/followups";

/**
 * Счётчик «моих» напоминаний для бейджа в сайдбаре: просроченные + на сегодня
 * (назначенные текущему пользователю). Заодно лениво рассылает пуши по
 * наступившим напоминаниям — чтобы работало без обязательного внешнего крона.
 */
export const GET = withErrorHandling(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const role = session.user.role as Role;
  const userId = session.user.id;
  if (!isAdminOrManager(role)) {
    return NextResponse.json({ overdue: 0, today: 0 });
  }

  // Ленивая рассылка наступивших напоминаний (идемпотентна через notifiedAt).
  await dispatchDueFollowupNotifications().catch(() => {});

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [overdue, today] = await Promise.all([
    prisma.followUp.count({
      where: { assigneeId: userId, status: "PENDING", dueDate: { lt: start } },
    }),
    prisma.followUp.count({
      where: { assigneeId: userId, status: "PENDING", dueDate: { gte: start, lt: end } },
    }),
  ]);

  return NextResponse.json({ overdue, today });
});
