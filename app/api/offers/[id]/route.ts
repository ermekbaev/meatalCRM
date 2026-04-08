import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const offer = await prisma.commercialOffer.findUnique({
    where: { id },
    include: {
      items: true,
      request: { include: { client: true } }, client: true,
      createdBy: true,
    },
  });

  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(offer);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { items } = body;

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
  };

  const offer = await prisma.$transaction(async (tx) => {
    await tx.offerItem.deleteMany({ where: { offerId: id } });
    return tx.commercialOffer.update({
      where: { id },
      data: { ...data, items: { create: items } },
      include: { items: true, request: { include: { client: true } }, createdBy: true },
    });
  });

  return NextResponse.json(offer);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.commercialOffer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
