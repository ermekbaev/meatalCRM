import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";

/**
 * Счётчик ещё не открытых портальных заявок для индикатора в сайдбаре.
 * «Не открытая» = firstViewedAt IS NULL: бейдж гаснет, как только менеджер
 * откроет страницу заявки (а не когда сменит статус). Так интуитивнее:
 * есть «прочитано / не прочитано», независимое от воркфлоу.
 *
 * ADMIN — все; MANAGER — только заявки своих компаний; остальные — 0.
 */
export const GET = withErrorHandling(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ count: 0 });

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.portalRequest.count({
    where: {
      firstViewedAt: null,
      ...(role === "MANAGER" ? { company: { managerId: session.user.id } } : {}),
    },
  });

  return NextResponse.json({ count });
});
