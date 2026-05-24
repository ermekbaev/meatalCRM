import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound, badRequest } from "@/lib/api-handler";
import { companyUpdateSchema } from "@/lib/validation";

/**
 * Кабинет видят ADMIN (любой) и MANAGER (только свой — где он `managerId`).
 * Для остальных ролей (включая CLIENT) — 403.
 */
async function loadCompanyForRequester(id: string, session: Session) {
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const company = await prisma.client.findFirst({
    where: {
      id,
      isPortalEnabled: true,
      ...(role === "MANAGER" ? { managerId: session.user.id } : {}),
    },
  });
  if (!company) throw notFound();
  return company;
}

export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const { id } = await params;
  await loadCompanyForRequester(id, session);

  const company = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      inn: true,
      phone: true,
      email: true,
      managerId: true,
      isPortalEnabled: true,
      createdAt: true,
      manager: { select: { id: true, name: true, email: true } },
      portalUsers: { select: { id: true, email: true, name: true, isBlocked: true, phone: true, createdAt: true } },
      _count: { select: { portalRequests: true, clientPositions: true } },
    },
  });
  return NextResponse.json(company);
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const { id } = await params;
  await loadCompanyForRequester(id, session);

  const data = await parseBody(req, companyUpdateSchema);

  // Смена менеджера — только админ (менеджер не должен «отдать» компанию кому-то ещё).
  if (data.managerId !== undefined && session.user.role !== "ADMIN") {
    throw forbidden("Сменить менеджера может только админ");
  }
  if (data.isPortalEnabled !== undefined && session.user.role !== "ADMIN") {
    throw forbidden("Отключить кабинет может только админ");
  }
  if (data.managerId !== undefined) {
    const manager = await prisma.user.findUnique({
      where: { id: data.managerId },
      select: { id: true, role: true, isBlocked: true },
    });
    if (!manager || manager.isBlocked) throw badRequest("Менеджер не найден");
    if (manager.role !== "ADMIN" && manager.role !== "MANAGER") {
      throw badRequest("Ответственный должен быть админом или менеджером");
    }
  }

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.inn !== undefined ? { inn: data.inn ?? null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.managerId !== undefined ? { managerId: data.managerId } : {}),
      ...(data.isPortalEnabled !== undefined ? { isPortalEnabled: data.isPortalEnabled } : {}),
    },
  });
  return NextResponse.json(updated);
});

/**
 * Удаление кабинета — только админ. Cascade-связи (PortalRequest/Item/Comment/File,
 * ClientPosition) удалятся через FK, у CLIENT-юзера companyId обнулится (SetNull).
 */
export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN") throw forbidden();

  const { id } = await params;
  const company = await prisma.client.findUnique({
    where: { id },
    select: { id: true, isPortalEnabled: true },
  });
  if (!company || !company.isPortalEnabled) throw notFound();

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
