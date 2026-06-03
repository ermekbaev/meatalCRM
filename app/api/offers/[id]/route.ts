import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { offerUpdateSchema } from "@/lib/validation";

export const GET = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const offer = await prisma.commercialOffer.findUnique({
    where: { id },
    include: {
      items: true,
      request: { include: { client: true } }, client: true,
      createdBy: true,
      manager: { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  if (!offer) throw notFound();
  return NextResponse.json(offer);
});

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") throw forbidden();

  const { id } = await params;
  const { items, ...body } = await parseBody(req, offerUpdateSchema);

  const data = {
    status: body.status,
    discount: body.discount,
    total: body.total,
    notes: body.notes ?? null,
    validUntil: body.validUntil ?? null,
    requestId: body.requestId ?? null,
    clientId: body.clientId ?? null,
    numberOverride: body.numberOverride ?? null,
    vatRate: body.vatRate,
    managerId: body.managerId ?? null,
    managerCustom: body.managerCustom ?? null,
    deliveryTerms: body.deliveryTerms ?? null,
  };

  const cleanItems = (items ?? []).map((item) => ({
    service: item.service,
    description: item.description ?? null,
    quantity: item.quantity,
    unit: item.unit,
    price: item.price,
    total: item.total,
  }));

  const offer = await prisma.$transaction(async (tx) => {
    await tx.offerItem.deleteMany({ where: { offerId: id } });
    return tx.commercialOffer.update({
      where: { id },
      data: { ...data, items: { create: cleanItems } },
      include: { items: true, request: { include: { client: true } }, createdBy: true, manager: true },
    });
  });

  return NextResponse.json(offer);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") throw forbidden();

  const { id } = await params;
  await prisma.commercialOffer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
