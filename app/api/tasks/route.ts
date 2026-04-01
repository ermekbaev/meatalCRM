import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { PRIORITY_LABELS } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search") ?? "";
  const status   = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        search ? { OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ]} : {},
        status     ? { status: status as any }     : {},
        priority   ? { priority: priority as any } : {},
        assigneeId ? { assigneeId }                : {},
      ],
    },
    include: {
      assignee:  { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
      _count:    { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const data = await req.json();

  const task = await prisma.task.create({
    data: {
      title:       data.title,
      description: data.description || null,
      status:      data.status ?? "TODO",
      priority:    data.priority ?? "MEDIUM",
      dueDate:     data.dueDate ? new Date(data.dueDate) : null,
      assigneeId:  data.assigneeId || null,
      clientId:    data.clientId || null,
      createdById: userId,
    },
    include: {
      assignee:  { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
    },
  });

  await sendTelegram(
    `📝 <b>Новая задача</b>\n` +
    `📌 ${task.title}\n` +
    `⚡ Приоритет: ${PRIORITY_LABELS[task.priority]}\n` +
    `👤 Исполнитель: ${task.assignee?.name ?? "Не назначен"}`
  );

  return NextResponse.json(task, { status: 201 });
}
