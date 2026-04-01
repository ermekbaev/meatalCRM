import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Полная замена позиций заявки
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { items } = await req.json();

  // Удаляем старые и создаём новые
  await prisma.requestItem.deleteMany({ where: { requestId: id } });

  if (items?.length) {
    await prisma.requestItem.createMany({
      data: items.map((item: any) => ({
        requestId: id,
        name: item.name,
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || "шт",
        price: parseFloat(item.price) || 0,
        purchasePrice: item.purchasePrice != null && item.purchasePrice !== "" ? parseFloat(item.purchasePrice) : null,
        discount: parseFloat(item.discount) || 0,
        total: parseFloat(item.total) || 0,
        isCustomerMaterial: item.isCustomerMaterial ?? false,
      })),
    });
  }

  // Пересчитываем сумму заявки по позициям
  const total = (items ?? []).reduce((sum: number, item: any) => sum + (parseFloat(item.total) || 0), 0);
  await prisma.request.update({ where: { id }, data: { amount: total } });

  const updated = await prisma.requestItem.findMany({ where: { requestId: id }, orderBy: { id: "asc" } });
  return NextResponse.json(updated);
}
