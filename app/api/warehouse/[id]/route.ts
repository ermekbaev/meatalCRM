import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeWarehousePayload(data: any) {
  return {
    metalType: String(data.metalType ?? "").trim(),
    steelGrade: data.steelGrade ? String(data.steelGrade).trim() : null,
    unit: String(data.unit ?? "шт").trim() || "шт",
    quantity: data.quantity ? parseFloat(String(data.quantity)) : 0,
    note: data.note ? String(data.note).trim() : null,
  };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const data = normalizeWarehousePayload(await req.json());
  if (!data.metalType) {
    return NextResponse.json({ error: "metalType is required" }, { status: 400 });
  }

  const item = await prisma.warehouseItem.update({
    where: { id },
    data: {
      ...data,
      updatedById: (session.user as any).id,
    },
    include: { updatedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(item);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.warehouseItem.update({
    where: { id },
    data: {
      isActive: false,
      updatedById: (session.user as any).id,
    },
  });

  return NextResponse.json({ ok: true });
}
