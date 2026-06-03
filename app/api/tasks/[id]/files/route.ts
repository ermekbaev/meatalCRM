import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized, forbidden, notFound } from "@/lib/api-handler";

export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  // Проверяем доступ к задаче перед возвратом списка файлов (защита от IDOR)
  const canSeeAll = role === "ADMIN" || role === "MANAGER" || role === "ENGINEER";
  if (!canSeeAll) {
    const task = await prisma.task.findFirst({
      where: {
        id,
        OR: [
          { assignees: { some: { id: userId } } },
          { workshop: { members: { some: { id: userId } } } },
        ],
      },
      select: { id: true },
    });
    if (!task) throw notFound();
  } else {
    const exists = await prisma.task.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw notFound();
  }

  const files = await prisma.taskFile.findMany({
    where: { taskId: id },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(files);
});
