import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized, notFound } from "@/lib/api-handler";

export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  // Проверяем доступ к заявке перед возвратом списка файлов (защита от IDOR)
  const canSeeAll = role === "ADMIN" || role === "MANAGER";
  const whereRequest = canSeeAll
    ? { id }
    : { id, ...(role === "FOREMAN" || role === "ENGINEER" ? { assigneeId: userId } : {}) };

  const exists = await prisma.request.findFirst({ where: whereRequest, select: { id: true } });
  if (!exists) throw notFound();

  const files = await prisma.requestFile.findMany({
    where: { requestId: id },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(files);
});
