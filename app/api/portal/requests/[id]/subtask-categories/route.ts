import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";
import { z } from "zod";

const schema = z.object({ name: z.string().trim().min(1).max(200) });

// Чек-листы ведут как менеджеры CRM, так и пользователи ЛК (CLIENT) —
// доступ к заявке проверяет getPortalRequestAccess (CLIENT → только своя компания).
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const data = await parseBody(req, schema);
  const last = await prisma.portalRequestSubtaskCategory.findFirst({
    where: { portalRequestId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const category = await prisma.portalRequestSubtaskCategory.create({
    data: { portalRequestId: id, name: data.name, order: (last?.order ?? 0) + 1 },
    include: { subtasks: true },
  });
  return NextResponse.json(category, { status: 201 });
});
