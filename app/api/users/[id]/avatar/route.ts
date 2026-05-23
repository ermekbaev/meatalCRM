import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden, badRequest, notFound } from "@/lib/api-handler";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Админ может менять аватар любому, пользователь — только себе
function canEdit(session: any, targetId: string) {
  const role = session.user?.role;
  return role === "ADMIN" || session.user?.id === targetId;
}

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  if (!canEdit(session, id)) throw forbidden();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) throw badRequest("Файл не передан");
  if (!ALLOWED.includes(file.type)) {
    throw badRequest("Допустимы только изображения (PNG, JPG, WebP, GIF)");
  }
  if (file.size > MAX_SIZE) {
    throw badRequest("Файл слишком большой (макс. 5 МБ)");
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
  if (!existing) throw notFound("Пользователь не найден");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await uploadFile(buffer, file.name, file.type, "avatars");

  if (existing.avatarUrl) await deleteFile(existing.avatarUrl);

  const user = await prisma.user.update({
    where: { id },
    data: { avatarUrl: key },
    select: { id: true, name: true, avatarUrl: true },
  });

  return NextResponse.json(user);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  if (!canEdit(session, id)) throw forbidden();

  const existing = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
  if (existing?.avatarUrl) await deleteFile(existing.avatarUrl);

  await prisma.user.update({ where: { id }, data: { avatarUrl: null } });
  return NextResponse.json({ ok: true });
});
