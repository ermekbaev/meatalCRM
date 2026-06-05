import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildObjectKey, getUploadUrl } from "@/lib/storage";
import { getPortalRequestAccess } from "@/lib/acl";
import { withErrorHandling, unauthorized, forbidden, badRequest, notFound, parseBody } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 1024 * 1024 * 1024; // 1 ГБ

const schema = z.object({
  name: z.string().min(1),
  type: z.string().default("application/octet-stream"),
  size: z.number().int().nonnegative().max(MAX_SIZE, "Файл слишком большой (макс. 1 ГБ)"),
  kind: z.enum(["DRAWING", "DOCUMENT"]).default("DRAWING"),
});

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const { name, type, kind } = await parseBody(req, schema);

  // Блокировка клиента при статусе В работе / Готова.
  if (session.user.role === "CLIENT") {
    const portalReq = await prisma.portalRequest.findUnique({ where: { id }, select: { status: true } });
    if (portalReq?.status === "IN_PROGRESS" || portalReq?.status === "READY") {
      throw forbidden("Заявка в работе — загрузка файлов недоступна");
    }
  }

  // Документы (счета/договоры) грузит только менеджер, не клиент.
  if (kind === "DOCUMENT" && session.user.role === "CLIENT") {
    throw badRequest("Документы загружает менеджер");
  }

  const key = buildObjectKey("portal", name);
  const uploadUrl = await getUploadUrl(key, type);

  return NextResponse.json({ key, uploadUrl });
});
