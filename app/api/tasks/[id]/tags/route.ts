import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — добавить тег к задаче, DELETE — убрать тег
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { tagId } = await req.json();

  await prisma.task.update({
    where: { id },
    data: { tags: { connect: { id: tagId } } },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { tagId } = await req.json();

  await prisma.task.update({
    where: { id },
    data: { tags: { disconnect: { id: tagId } } },
  });

  return NextResponse.json({ ok: true });
}
