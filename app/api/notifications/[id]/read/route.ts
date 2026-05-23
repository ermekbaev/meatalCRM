import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized } from "@/lib/api-handler";

export const POST = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const userId = session.user.id;
  const { id } = await params;

  await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
});
