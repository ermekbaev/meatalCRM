import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const INCLUDE = {
  client: true,
  request: { select: { id: true, number: true, title: true } },
  createdBy: { select: { id: true, name: true } },
  items: { orderBy: { id: "asc" as const } },
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const clientId = searchParams.get("clientId") ?? "";

  const invoices = await prisma.invoice.findMany({
    where: {
      AND: [
        search ? { client: { name: { contains: search, mode: "insensitive" } } } : {},
        clientId ? { clientId } : {},
      ],
    },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { items, ...data } = await req.json();

  const invoice = await prisma.invoice.create({
    data: {
      ...data,
      date: data.date ? new Date(data.date) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      vatRate: data.vatRate ?? 0,
      createdById: userId,
      items: {
        create: (items ?? []).map((it: any) => ({
          name: it.name,
          quantity: parseFloat(it.quantity) || 1,
          unit: it.unit || "шт",
          price: parseFloat(it.price) || 0,
          total: parseFloat(it.total) || 0,
        })),
      },
    },
    include: INCLUDE,
  });

  return NextResponse.json(invoice, { status: 201 });
}
