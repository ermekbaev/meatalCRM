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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: INCLUDE });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { items, ...data } = await req.json();

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        basis: data.basis ?? null,
        vatRate: data.vatRate ?? 0,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        date: data.date ? new Date(data.date) : undefined,
        notes: data.notes ?? null,
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
  });

  return NextResponse.json(invoice);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
