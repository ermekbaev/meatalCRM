import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const data = await req.json();
  const updateData: any = {};

  if (data.name !== undefined) {
    const name = String(data.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    updateData.name = name;
  }

  if (data.order !== undefined) {
    updateData.order = Number.isFinite(Number(data.order)) ? Number(data.order) : 0;
  }

  if (Array.isArray(data.memberIds)) {
    updateData.members = {
      set: data.memberIds.filter(Boolean).map((memberId: string) => ({ id: memberId })),
    };
  }

  const workshop = await prisma.workshop.update({
    where: { id },
    data: updateData,
    include: {
      members: {
        select: { id: true, name: true, role: true, position: true },
        orderBy: { name: "asc" },
      },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json(workshop);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.workshop.findUnique({ where: { id }, select: { isVirtual: true } });
  if (existing?.isVirtual) {
    return NextResponse.json({ error: "Виртуальный цех удалить нельзя" }, { status: 400 });
  }
  await prisma.workshop.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
