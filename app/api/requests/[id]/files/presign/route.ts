import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildObjectKey, getUploadUrl } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden, notFound, parseBody } from "@/lib/api-handler";

const MAX_SIZE = 1024 * 1024 * 1024; // 1 ГБ

const schema = z.object({
  name: z.string().min(1),
  type: z.string().default("application/octet-stream"),
  size: z.number().int().nonnegative().max(MAX_SIZE, "Файл слишком большой (макс. 1 ГБ)"),
});

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  // CONTRACTOR и EMPLOYEE не могут загружать файлы в заявки
  const role = session.user.role;
  if (role === "CONTRACTOR" || role === "EMPLOYEE") throw forbidden();

  const { id } = await params;
  const userId = session.user.id;

  // Проверяем что заявка существует и пользователь имеет к ней доступ
  const canSeeAll = role === "ADMIN" || role === "MANAGER";
  const request = await prisma.request.findFirst({
    where: canSeeAll
      ? { id }
      : { id, assigneeId: userId }, // FOREMAN/ENGINEER — только свои заявки
    select: { id: true },
  });
  if (!request) throw notFound();

  const { name, type } = await parseBody(req, schema);

  const key = buildObjectKey("requests", name);
  const uploadUrl = await getUploadUrl(key, type);

  return NextResponse.json({ key, uploadUrl });
});
