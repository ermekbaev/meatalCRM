import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const body = await req.json();

  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      ...(body.text !== undefined && { text: body.text }),
      ...(body.isCompleted !== undefined && { isCompleted: body.isCompleted }),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  await prisma.checklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
