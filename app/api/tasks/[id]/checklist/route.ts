import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Текст обязателен" }, { status: 400 });

  const count = await prisma.checklistItem.count({ where: { taskId: id } });

  const item = await prisma.checklistItem.create({
    data: { taskId: id, text: text.trim(), order: count },
  });

  return NextResponse.json(item, { status: 201 });
}
