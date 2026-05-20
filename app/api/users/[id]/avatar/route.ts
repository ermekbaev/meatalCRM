import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Админ может менять аватар любому, пользователь — только себе
function canEdit(session: any, targetId: string) {
  const role = session.user?.role;
  return role === "ADMIN" || session.user?.id === targetId;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!canEdit(session, id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Допустимы только изображения (PNG, JPG, WebP, GIF)" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Файл слишком большой (макс. 5 МБ)" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
  if (!existing) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await uploadFile(buffer, file.name, file.type, "avatars");

  if (existing.avatarUrl) await deleteFile(existing.avatarUrl);

  const user = await prisma.user.update({
    where: { id },
    data: { avatarUrl: key },
    select: { id: true, name: true, avatarUrl: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!canEdit(session, id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
  if (existing?.avatarUrl) await deleteFile(existing.avatarUrl);

  await prisma.user.update({ where: { id }, data: { avatarUrl: null } });
  return NextResponse.json({ ok: true });
}
