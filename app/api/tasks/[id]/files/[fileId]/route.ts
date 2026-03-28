import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;

  const file = await prisma.taskFile.findUnique({ where: { id: fileId } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteFile(file.filename);
  await prisma.taskFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
}
