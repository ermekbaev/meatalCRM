import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;

  const file = await prisma.requestFile.findUnique({ where: { id: fileId } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Удаляем физический файл (игнорируем ошибку если уже удалён)
  try {
    await unlink(join(process.cwd(), "public", "uploads", file.filename));
  } catch {}

  await prisma.requestFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
}
