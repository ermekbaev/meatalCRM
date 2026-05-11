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
  if (typeof data.name === "string" && data.name.trim()) updateData.name = data.name.trim();
  if (typeof data.color === "string") updateData.color = data.color;
  if (typeof data.order === "number") updateData.order = data.order;

  const column = await prisma.taskColumn.update({ where: { id }, data: updateData });
  return NextResponse.json(column);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const column = await prisma.taskColumn.findUnique({ where: { id } });
  if (!column) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (column.isSystem) {
    return NextResponse.json({ error: "Нельзя удалить системную колонку" }, { status: 400 });
  }

  // Переносим задачи из этой колонки в TODO
  await prisma.task.updateMany({
    where: { status: column.key },
    data: { status: "TODO" },
  });
  await prisma.taskColumn.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
