import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, unauthorized, forbidden, badRequest } from "@/lib/api-handler";

/**
 * Поиск контрагента по ИНН. Используется формой создания кабинета
 * (/companies/new), чтобы предложить «привязать кабинет к существующему
 * контрагенту» вместо создания дубля.
 *
 * Возвращает первого найденного Client с этим ИНН либо null. Тащим минимум
 * полей и `isPortalEnabled` — этого хватает форме, чтобы решить, что показать.
 * Доступ — только ADMIN/MANAGER (для CLIENT middleware уже вернёт 403).
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") throw forbidden();

  const inn = req.nextUrl.searchParams.get("inn")?.trim();
  if (!inn || inn.length < 10) throw badRequest("Укажите ИНН (минимум 10 символов)");

  const client = await prisma.client.findFirst({
    where: { inn },
    select: {
      id: true,
      name: true,
      shortName: true,
      inn: true,
      type: true,
      isPortalEnabled: true,
    },
  });

  return NextResponse.json(client);
});
