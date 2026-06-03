import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { requestItemsReplaceSchema } from "@/lib/validation";

// Полная замена позиций заявки
export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  // CONTRACTOR и EMPLOYEE не могут редактировать позиции заявок
  if (role === "CONTRACTOR" || role === "EMPLOYEE") throw forbidden();

  const { id } = await params;
  const userId = session.user.id;

  // Проверяем доступ к заявке: FOREMAN/ENGINEER — только свои
  const canSeeAll = role === "ADMIN" || role === "MANAGER";
  const request = await prisma.request.findFirst({
    where: canSeeAll ? { id } : { id, assigneeId: userId },
    select: { id: true },
  });
  if (!request) throw notFound();

  const { items } = await parseBody(req, requestItemsReplaceSchema);

  // Удаляем старые и создаём новые
  await prisma.requestItem.deleteMany({ where: { requestId: id } });

  if (items?.length) {
    await prisma.requestItem.createMany({
      data: items.map((item) => ({
        requestId: id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        purchasePrice: item.purchasePrice ?? null,
        discount: item.discount,
        total: item.total,
        isCustomerMaterial: item.isCustomerMaterial,
      })),
    });
  }

  // Пересчитываем сумму заявки по позициям
  const total = (items ?? []).reduce((sum, item) => sum + item.total, 0);
  await prisma.request.update({ where: { id }, data: { amount: total } });

  const updated = await prisma.requestItem.findMany({ where: { requestId: id }, orderBy: { id: "asc" } });
  return NextResponse.json(updated);
});
