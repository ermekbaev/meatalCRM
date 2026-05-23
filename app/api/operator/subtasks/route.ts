import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized } from "@/lib/api-handler";

export const GET = withErrorHandling(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const userId = session.user.id;

  const subtasks = await prisma.subTask.findMany({
    where: { assigneeId: userId },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          client: { select: { id: true, name: true, shortName: true } },
          workshop: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { dueDate: "asc" },
      { order: "asc" },
    ],
  });

  return NextResponse.json(subtasks);
});
