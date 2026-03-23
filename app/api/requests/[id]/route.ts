import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { REQUEST_STATUS_LABELS } from "@/lib/utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      client: true,
      assignee: true,
      items: { orderBy: { id: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
      changeLogs: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
      offers: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(request);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();
  const userId = (session.user as any).id;

  const old = await prisma.request.findUnique({ where: { id } });

  const updated = await prisma.request.update({
    where: { id },
    data,
    include: { client: true, assignee: true },
  });

  if (old) {
    const tracked = ["status", "priority", "title", "assigneeId", "amount"] as const;
    for (const field of tracked) {
      const oldVal = String(old[field] ?? "");
      const newVal = String(updated[field] ?? "");
      if (oldVal !== newVal) {
        await prisma.changeLog.create({
          data: { requestId: id, userId, field, oldValue: oldVal, newValue: newVal },
        });
        if (field === "status") {
          await sendTelegram(
            `🔄 <b>Статус заявки #${updated.number} изменён</b>\n` +
            `📌 ${updated.title}\n` +
            `${REQUEST_STATUS_LABELS[oldVal as any] ?? oldVal} → <b>${REQUEST_STATUS_LABELS[newVal as any] ?? newVal}</b>`
          );
        }
      }
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.request.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
