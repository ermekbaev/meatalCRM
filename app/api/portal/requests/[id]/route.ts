import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, notFound, forbidden } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";
import { portalRequestStatusSchema } from "@/lib/validation";

/**
 * Детали портальной заявки (позиции, файлы, общий тред комментариев).
 * Доступ — через `getPortalRequestAccess`: CLIENT → своя компания, ADMIN → все,
 * MANAGER → компании, где он `managerId`.
 */
export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const request = await prisma.portalRequest.findUnique({
    where: { id },
    include: {
      createdByUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
      company: { select: { id: true, name: true } },
      items: { orderBy: { name: "asc" } },
      comments: {
        include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      files: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return NextResponse.json(request);
});

/**
 * Смена статуса заявки (NEW / IN_PROGRESS / READY).
 * Только внутренние ADMIN / MANAGER (ответственный за компанию). CLIENT — 403.
 */
export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role === "CLIENT") throw forbidden();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const { status } = await parseBody(req, portalRequestStatusSchema);

  const updated = await prisma.portalRequest.update({
    where: { id },
    data: { status },
    select: { id: true, status: true, updatedAt: true },
  });
  return NextResponse.json(updated);
});
