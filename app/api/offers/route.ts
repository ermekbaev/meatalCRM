import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { OfferStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { withErrorHandling, parseBody, unauthorized } from "@/lib/api-handler";
import { getPageParams, paginated } from "@/lib/pagination";
import { offerCreateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const statusList = (searchParams.get("status") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const pp = getPageParams(searchParams);

  const where = {
    AND: [
      search ? {
        OR: [
          { request: { title: { contains: search, mode: "insensitive" as const } } },
          { client: { name: { contains: search, mode: "insensitive" as const } } },
        ],
      } : {},
      statusList.length ? { status: { in: statusList as OfferStatus[] } } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.commercialOffer.findMany({
      where,
      include: {
        request: { include: { client: true } },
        client: true,
        createdBy: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      skip: pp.skip,
      take: pp.take,
    }),
    prisma.commercialOffer.count({ where }),
  ]);

  return NextResponse.json(paginated(items, total, pp));
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const userId = session.user.id;
  const { items, ...data } = await parseBody(req, offerCreateSchema);

  const offer = await prisma.commercialOffer.create({
    data: {
      status: data.status ?? "DRAFT",
      discount: data.discount,
      vatRate: data.vatRate,
      total: data.total,
      notes: data.notes ?? null,
      requestId: data.requestId ?? null,
      clientId: data.clientId ?? null,
      numberOverride: data.numberOverride ?? null,
      validUntil: data.validUntil ?? null,
      managerId: data.managerId ?? null,
      managerCustom: data.managerCustom ?? null,
      deliveryTerms: data.deliveryTerms ?? null,
      createdById: userId,
      items: {
        create: (items ?? []).map((item) => ({
          service: item.service,
          description: item.description ?? null,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          total: item.total,
        })),
      },
    },
    include: { items: true, request: { include: { client: true } }, client: true, createdBy: true, manager: true },
  });

  await sendTelegram(
    `📄 <b>Новое КП №${offer.numberOverride ?? offer.number}</b>\n` +
    `🏢 Клиент: ${(offer.client || offer.request?.client)?.name ?? "—"}\n` +
    `💰 Сумма: ${offer.total.toLocaleString("ru")} ₽`
  );

  return NextResponse.json(offer, { status: 201 });
});
