import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { withErrorHandling, parseBody, unauthorized } from "@/lib/api-handler";
import { getPageParams, paginated } from "@/lib/pagination";
import { invoiceCreateSchema } from "@/lib/validation";

const INCLUDE = {
  client: true,
  request: { select: { id: true, number: true, title: true } },
  createdBy: { select: { id: true, name: true } },
  items: { orderBy: { id: "asc" as const } },
};

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const clientId = searchParams.get("clientId") ?? "";
  const pp = getPageParams(searchParams);

  const where = {
    AND: [
      search ? { client: { name: { contains: search, mode: "insensitive" as const } } } : {},
      clientId ? { clientId } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: pp.skip,
      take: pp.take,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json(paginated(items, total, pp));
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const userId = session.user.id;
  const { items, ...data } = await parseBody(req, invoiceCreateSchema);

  const invoice = await prisma.invoice.create({
    data: {
      basis: data.basis ?? null,
      notes: data.notes ?? null,
      numberOverride: data.numberOverride ?? null,
      clientId: data.clientId,
      requestId: data.requestId ?? null,
      date: data.date ?? new Date(),
      dueDate: data.dueDate ?? null,
      vatRate: data.vatRate ?? 0,
      paymentStatus: data.paymentStatus ?? "WAITING",
      createdById: userId,
      items: {
        create: (items ?? []).map((it) => ({
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          price: it.price,
          total: it.total,
        })),
      },
    },
    include: INCLUDE,
  });

  await sendTelegram(
    `🧾 <b>Новый счёт #${invoice.numberOverride ?? invoice.number}</b>\n` +
    `🏢 Клиент: ${invoice.client?.name ?? "—"}\n` +
    `💰 Сумма: ${invoice.items.reduce((s: number, i: any) => s + i.total, 0).toLocaleString("ru")} ₽`
  );

  return NextResponse.json(invoice, { status: 201 });
});
