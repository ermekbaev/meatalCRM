import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile, headObject } from "@/lib/storage";
import { getPortalRequestAccess } from "@/lib/acl";
import { withErrorHandling, unauthorized, badRequest, notFound, parseBody } from "@/lib/api-handler";

const MAX_SIZE = 1024 * 1024 * 1024; // 1 ГБ

const schema = z.object({
  key: z.string().regex(/^portal\/[a-f0-9-]+\.[\w.]+$/i, "Невалидный ключ"),
  name: z.string().min(1),
  type: z.string().default("application/octet-stream"),
  kind: z.enum(["DRAWING", "DOCUMENT"]).default("DRAWING"),
});

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const { key, name, type, kind } = await parseBody(req, schema);

  if (kind === "DOCUMENT" && session.user.role === "CLIENT") {
    throw badRequest("Документы загружает менеджер");
  }

  const head = await headObject(key);
  if (!head) throw badRequest("Файл не найден в хранилище");
  if (head.size > MAX_SIZE) {
    await deleteFile(key);
    throw badRequest("Файл слишком большой (макс. 1 ГБ)");
  }

  const record = await prisma.portalFile.create({
    data: {
      filename: key,
      originalName: name,
      size: head.size,
      mimeType: type || null,
      kind,
      portalRequestId: id,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(record, { status: 201 });
});
