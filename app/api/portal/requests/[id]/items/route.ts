import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";
import { portalRequestItemSchema } from "@/lib/validation";

/**
 * Добавление новой позиции в портальную заявку.
 * Доступ — через getPortalRequestAccess (CLIENT — своя; ADMIN — любая;
 * MANAGER — своих компаний). Клиент может править состав уже созданной заявки:
 * «забыл деталь, дозаказываю» — менеджер увидит изменение.
 */
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const data = await parseBody(req, portalRequestItemSchema);

  const created = await prisma.portalRequestItem.create({
    data: {
      portalRequestId: id,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
    },
  });
  return NextResponse.json(created, { status: 201 });
});
