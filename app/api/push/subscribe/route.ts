import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, badRequest } from "@/lib/api-handler";
import { pushSubscribeSchema } from "@/lib/validation";
import { z } from "zod";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const userId = session.user.id;
  const { endpoint, keys } = await parseBody(req, pushSubscribeSchema);

  // Если endpoint уже занят другим пользователем — перезаписываем на текущего
  // (смена устройства/браузера). Если тот же user — просто обновляем ключи.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const userId = session.user.id;
  const { endpoint } = await parseBody(req, z.object({ endpoint: z.string().url() }));
  if (!endpoint) throw badRequest();

  // Удаляем только подписки текущего пользователя (защита от отписки чужих устройств)
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  return NextResponse.json({ ok: true });
});
