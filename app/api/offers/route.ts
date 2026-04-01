import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const offers = await prisma.commercialOffer.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { request: { title: { contains: search, mode: "insensitive" } } },
            { client: { name: { contains: search, mode: "insensitive" } } },
          ],
        } : {},
        status ? { status: status as any } : {},
      ],
    },
    include: {
      request: { include: { client: true } },
      client: true,
      createdBy: { select: { id: true, name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(offers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();
  const { items, ...data } = body;

  const cleanData: any = {
    status: data.status ?? "DRAFT",
    discount: parseFloat(String(data.discount)) || 0,
    vatRate: parseFloat(String(data.vatRate)) || 0,
    total: parseFloat(String(data.total)) || 0,
    notes: data.notes || null,
    requestId: data.requestId || null,
    clientId: data.clientId || null,
    numberOverride: data.numberOverride?.trim() || null,
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
    createdById: userId,
  };

  const cleanItems = (items ?? []).map((item: any) => ({
    service: item.service ?? "",
    description: item.description || null,
    quantity: parseFloat(String(item.quantity)) || 1,
    unit: item.unit ?? "шт",
    price: parseFloat(String(item.price)) || 0,
    total: parseFloat(String(item.total)) || 0,
  }));

  try {
    const offer = await prisma.commercialOffer.create({
      data: {
        ...cleanData,
        items: { create: cleanItems },
      },
      include: { items: true, request: { include: { client: true } }, client: true, createdBy: true },
    });
    await sendTelegram(
      `📄 <b>Новое КП №${offer.numberOverride ?? offer.number}</b>\n` +
      `🏢 Клиент: ${(offer.client || offer.request?.client)?.name ?? "—"}\n` +
      `💰 Сумма: ${offer.total.toLocaleString("ru")} ₽`
    );

    return NextResponse.json(offer, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/offers error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
