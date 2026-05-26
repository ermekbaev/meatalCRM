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
import { portalUserUpdateSchema } from "@/lib/validation";

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
 * Привязка пользователя к кабинету — критическая часть ACL: пользователь
 * должен быть CLIENT и его companyId === id кабинета. Иначе менеджер мог бы
 * подменить параметр userId на чужого пользователя.
 */
async function loadPortalUser(companyId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId, role: "CLIENT" },
    select: { id: true },
  });
  if (!user) throw notFound();
  return user;
}

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, userId } = await params;
  await loadCompanyForRequester(id, session);
  await loadPortalUser(id, userId);

  const data = await parseBody(req, portalUserUpdateSchema);

  // Email уникальный по всей таблице, проверяем коллизию руками, чтобы вернуть
  // 400 вместо 500 от прижма-уникального индекса.
  if (data.email) {
    const dupe = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: userId } },
      select: { id: true },
    });
    if (dupe) throw badRequest("Пользователь с таким email уже существует");
  }

  const updateData: {
    email?: string;
    name?: string;
    phone?: string | null;
    isBlocked?: boolean;
    password?: string;
  } = {};
  if (data.email !== undefined) updateData.email = data.email;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone ?? null;
  if (data.isBlocked !== undefined) updateData.isBlocked = data.isBlocked;
  // password === "" означает «не менять» (форма со пустым полем).
  if (data.password) updateData.password = await hash(data.password, 12);

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, phone: true, isBlocked: true, createdAt: true },
  });
  return NextResponse.json(user);
});

/**
 * Удаление пользователя кабинета.
 * PortalComment / PortalFile ссылаются на User без onDelete, поэтому если у
 * пользователя есть активность — прижма откажет FK-ошибкой. Проверяем явно
 * и предлагаем заблокировать вместо удаления (так история не теряется).
 */
export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id, userId } = await params;
  await loadCompanyForRequester(id, session);
  await loadPortalUser(id, userId);

  const [comments, files, requests] = await Promise.all([
    prisma.portalComment.count({ where: { userId } }),
    prisma.portalFile.count({ where: { uploadedById: userId } }),
    prisma.portalRequest.count({ where: { createdByUserId: userId } }),
  ]);
  if (comments + files + requests > 0) {
    throw badRequest("У пользователя есть заявки/комментарии/файлы — заблокируйте его вместо удаления");
  }

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
});
