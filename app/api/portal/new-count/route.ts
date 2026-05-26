import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";

/**
 * Счётчик портальных заявок со статусом NEW для индикатора в сайдбаре.
 * ADMIN — все; MANAGER — заявки в его компаниях; остальные — 0.
 * Не падает на неавторизованных (возвращает 0), потому что вызывается
 * из клиентского Sidebar до завершения сессии.
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
      status: "NEW",
      ...(role === "MANAGER" ? { company: { managerId: session.user.id } } : {}),
    },
  });

  return NextResponse.json({ count });
});
