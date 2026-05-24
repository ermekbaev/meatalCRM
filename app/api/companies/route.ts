import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized, forbidden, badRequest } from "@/lib/api-handler";
import { companyCreateSchema, companyAttachExistingSchema } from "@/lib/validation";

/**
 * Список компаний-кабинетов.
 *  - ADMIN видит все (isPortalEnabled=true).
 *  - MANAGER видит только те, где он ответственный (managerId === его id).
 *  - Все остальные роли (включая CLIENT) — 403.
 */
export const GET = withErrorHandling(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const companies = await prisma.client.findMany({
    where: {
      isPortalEnabled: true,
      ...(role === "MANAGER" ? { managerId: session.user.id } : {}),
    },
    select: {
      id: true,
      name: true,
      inn: true,
      phone: true,
      email: true,
      managerId: true,
      manager: { select: { id: true, name: true } },
      createdAt: true,
      _count: { select: { portalRequests: true, portalUsers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(companies);
});

async function validateManager(managerId: string) {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true, role: true, isBlocked: true },
  });
  if (!manager || manager.isBlocked) throw badRequest("Менеджер не найден");
  if (manager.role !== "ADMIN" && manager.role !== "MANAGER") {
    throw badRequest("Ответственный должен быть админом или менеджером");
  }
}

const COMPANY_SELECT = {
  id: true,
  name: true,
  inn: true,
  phone: true,
  email: true,
  managerId: true,
  manager: { select: { id: true, name: true } },
  createdAt: true,
  portalUsers: { select: { id: true, email: true, name: true } },
} as const;

/**
 * Создание кабинета.
 *  - Только ADMIN.
 *  - Два режима, определяются наличием `existingClientId` в теле:
 *    (1) НОВЫЙ контрагент: создаём `Client(type=COMPANY, isPortalEnabled=true)` + CLIENT-юзер.
 *    (2) ПРИВЯЗКА к существующему контрагенту: ставим флаг и менеджера на уже
 *        имеющемся Client, создаём CLIENT-юзера. Этот путь исключает дубли
 *        контрагента, когда у клиента уже есть история в CRM.
 *  - Транзакционно. CLIENT-юзер всегда один на компанию (на MVP).
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN") throw forbidden();

  const raw = await req.json();

  // Режим определяется наличием existingClientId — никаких хитрых union'ов
  // в zod, чтобы ошибки полей оставались читаемыми на клиенте.
  if (typeof raw?.existingClientId === "string") {
    const data = companyAttachExistingSchema.parse(raw);
    await validateManager(data.managerId);

    const existing = await prisma.client.findUnique({
      where: { id: data.existingClientId },
      select: { id: true, isPortalEnabled: true },
    });
    if (!existing) throw badRequest("Контрагент не найден");
    if (existing.isPortalEnabled) {
      throw badRequest("У этого контрагента уже есть кабинет");
    }

    const hashedPassword = await hash(data.user.password, 12);

    const company = await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: data.existingClientId },
        // Если у клиента был type=INDIVIDUAL — переключаем на COMPANY:
        // кабинет имеет смысл только для юр.лица.
        data: {
          type: "COMPANY",
          isPortalEnabled: true,
          managerId: data.managerId,
        },
      });

      await tx.user.create({
        data: {
          email: data.user.email,
          password: hashedPassword,
          name: data.user.name,
          role: "CLIENT",
          phone: data.user.phone ?? null,
          companyId: data.existingClientId,
        },
      });

      return tx.client.findUnique({
        where: { id: data.existingClientId },
        select: COMPANY_SELECT,
      });
    });

    return NextResponse.json(company, { status: 201 });
  }

  // ─── Создание нового контрагента ───────────────────────────────────────────
  const data = companyCreateSchema.parse(raw);
  await validateManager(data.managerId);

  const hashedPassword = await hash(data.user.password, 12);

  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.client.create({
      data: {
        type: "COMPANY",
        name: data.name,
        shortName: data.shortName ?? null,
        inn: data.inn ?? null,
        kpp: data.kpp ?? null,
        ogrn: data.ogrn ?? null,
        legalAddress: data.legalAddress ?? null,
        director: data.director ?? null,
        phone: data.phone ?? null,
        email: data.email || null,
        managerId: data.managerId,
        isPortalEnabled: true,
      },
    });

    await tx.user.create({
      data: {
        email: data.user.email,
        password: hashedPassword,
        name: data.user.name,
        role: "CLIENT",
        phone: data.user.phone ?? null,
        companyId: created.id,
      },
    });

    return tx.client.findUnique({
      where: { id: created.id },
      select: COMPANY_SELECT,
    });
  });

  return NextResponse.json(company, { status: 201 });
});
