import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee:  { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
      files: {
        orderBy: { createdAt: "asc" },
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
      checklist: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      tags: true,
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  const task = await prisma.task.update({
    where: { id },
    data: {
      title:       data.title,
      description: data.description ?? null,
      status:      data.status,
      priority:    data.priority,
      dueDate:     data.dueDate ? new Date(data.dueDate) : null,
      assigneeId:  data.assigneeId ?? null,
      clientId:    data.clientId ?? null,
    },
    include: {
      assignee:  { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      client:    { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
