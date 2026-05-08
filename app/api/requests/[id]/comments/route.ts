import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Текст комментария не может быть пустым" }, { status: 400 });
  const userId = (session.user as any).id;

  const comment = await prisma.comment.create({
    data: { text, requestId: id, userId },
    include: { user: { select: { id: true, name: true, position: true } } },
  });

  const request = await prisma.request.findUnique({ where: { id }, select: { number: true, title: true } });
  if (request) {
    await sendTelegram(
      `💬 <b>Комментарий к заявке #${request.number}</b>\n` +
      `📌 ${request.title}\n` +
      `👤 ${comment.user.name}: ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}`
    );
  }

  return NextResponse.json(comment, { status: 201 });
}
