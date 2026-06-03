import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { invoiceUpdateSchema } from "@/lib/validation";

const INCLUDE = {
  client: true,
  request: { select: { id: true, number: true, title: true } },
  createdBy: { select: { id: true, name: true } },
  items: { orderBy: { id: "asc" as const } },
};

export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: INCLUDE });
  if (!invoice) throw notFound();
  return NextResponse.json(invoice);
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") throw forbidden();

  const { id } = await params;
  const { items, ...data } = await parseBody(req, invoiceUpdateSchema);

  // Лёгкий PATCH-режим: меняем только статус, не трогаем позиции
  if (data.paymentStatusOnly) {
    const updated = await prisma.invoice.update({
      where: { id },
      data: { paymentStatus: data.paymentStatus },
      include: INCLUDE,
    });
    return NextResponse.json(updated);
  }

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        basis: data.basis ?? null,
        vatRate: data.vatRate ?? 0,
        dueDate: data.dueDate ?? null,
        date: data.date ?? undefined,
        notes: data.notes ?? null,
        ...(data.paymentStatus ? { paymentStatus: data.paymentStatus } : {}),
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
  });

  return NextResponse.json(invoice);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") throw forbidden();

  const { id } = await params;
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
