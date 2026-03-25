import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { PRIORITY_LABELS, REQUEST_STATUS_LABELS } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const clientId = searchParams.get("clientId") ?? "";

  const requests = await prisma.request.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { client: { name: { contains: search, mode: "insensitive" } } },
          ],
        } : {},
        status ? { status: status as any } : {},
        priority ? { priority: priority as any } : {},
        clientId ? { clientId } : {},
      ],
    },
    include: {
      client: { select: { id: true, name: true, type: true } },
      assignee: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items, ...data } = await req.json();

  const request = await prisma.request.create({
    data: {
      ...data,
      items: items?.length
        ? { create: items.map((item: any) => ({
            name: item.name,
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || "шт",
            price: parseFloat(item.price) || 0,
            discount: parseFloat(item.discount) || 0,
            total: parseFloat(item.total) || 0,
            isCustomerMaterial: item.isCustomerMaterial ?? false,
          })) }
        : undefined,
    },
    include: { client: true, assignee: true, items: true },
  });

  await sendTelegram(
    `📋 <b>Новая заявка #${request.number}</b>\n` +
    `📌 ${request.title}\n` +
    `🏢 Клиент: ${request.client?.name ?? "—"}\n` +
    `⚡ Приоритет: ${PRIORITY_LABELS[request.priority]}\n` +
    `👤 Ответственный: ${request.assignee?.name ?? "Не назначен"}`
  );

  return NextResponse.json(request, { status: 201 });
}
