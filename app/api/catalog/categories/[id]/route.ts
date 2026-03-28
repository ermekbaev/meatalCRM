import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name, parentId } = await req.json();

  const category = await prisma.catalogCategory.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(parentId !== undefined && { parentId: parentId ?? null }),
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Обнуляем categoryId у позиций этой категории
  await prisma.serviceCatalog.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });

  // Переносим дочерние категории на уровень родителя
  const cat = await prisma.catalogCategory.findUnique({ where: { id } });
  await prisma.catalogCategory.updateMany({
    where: { parentId: id },
    data: { parentId: cat?.parentId ?? null },
  });

  await prisma.catalogCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
