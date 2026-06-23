import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, unauthorized, badRequest } from "@/lib/api-handler";
import { dispatchDueFollowupNotifications } from "@/lib/followups";

/**
 * Крон-эндпоинт рассылки напоминаний «пора позвонить».
 * Защита: заголовок `x-cron-secret` или `?secret=` должен совпадать с
 * env `CRON_SECRET`. Если переменная не задана — эндпоинт выключен (503),
 * чтобы случайно не открыть его наружу.
 *
 * Пример внешнего крона на VPS (каждый час в рабочее время):
 *   0 9-19 * * * curl -s -H "x-cron-secret: $CRON_SECRET" https://host/api/cron/followups-due
 *
 * Рассылка идемпотентна (notifiedAt), поэтому даже без крона она же
 * срабатывает лениво при опросе сайдбара — крон лишь повышает своевременность.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw badRequest("CRON_SECRET не настроен");

  const provided =
    req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
  if (provided !== secret) throw unauthorized();

  const sent = await dispatchDueFollowupNotifications();
  return NextResponse.json({ ok: true, sent });
}

export const GET = withErrorHandling(handle);
export const POST = withErrorHandling(handle);
