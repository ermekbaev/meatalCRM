import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";
import { commentSchema } from "@/lib/validation";

/**
 * Общий тред комментариев портальной заявки (клиент + внутренние пишут в одну ленту).
 * Доступ — через `getPortalRequestAccess` (CLIENT — своя; MANAGER — свои компании; ADMIN — все).
 */
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const { text } = await parseBody(req, commentSchema);

  const comment = await prisma.portalComment.create({
    data: { text, portalRequestId: id, userId: session.user.id },
    include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
});
