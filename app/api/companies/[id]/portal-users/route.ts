import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  withErrorHandling,
  parseBody,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
} from "@/lib/api-handler";
import { portalUserCreateSchema } from "@/lib/validation";

/**
 * Проверка доступа к кабинету: ADMIN — к любому; MANAGER — только к своим.
 * Используется и для GET/POST/PUT/DELETE портальных пользователей.
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
    select: { id: true },
  });
  if (!company) throw notFound();
  return company;
}

/**
 * Создание нового CLIENT-пользователя в кабинете.
 * Доступно ADMIN и MANAGER (своих компаний).
 * Email уникален в рамках всей таблицы User — на коллизию отвечаем 400.
 */
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  await loadCompanyForRequester(id, session);

  const data = await parseBody(req, portalUserCreateSchema);

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) throw badRequest("Пользователь с таким email уже существует");

  const hashed = await hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashed,
      name: data.name,
      role: "CLIENT",
      phone: data.phone ?? null,
      companyId: id,
    },
    select: { id: true, name: true, email: true, phone: true, isBlocked: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
});
