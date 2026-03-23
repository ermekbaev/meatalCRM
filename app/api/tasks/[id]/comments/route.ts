import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Текст комментария не может быть пустым" }, { status: 400 });
  const userId = (session.user as any).id;

  const comment = await prisma.taskComment.create({
    data: { text, taskId: id, userId },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
