import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, badRequest, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  // kind: DRAWING — клиент или менеджер; DOCUMENT — только внутренние роли
  // (счета, договоры). По умолчанию DRAWING для совместимости со старым клиентом.
  const rawKind = (formData.get("kind") as string | null) ?? "DRAWING";
  const kind = rawKind === "DOCUMENT" ? "DOCUMENT" : "DRAWING";

  if (!file) throw badRequest("Файл не передан");
  if (file.size > MAX_SIZE) throw badRequest("Файл слишком большой (макс. 20 МБ)");
  if (kind === "DOCUMENT" && session.user.role === "CLIENT") {
    throw badRequest("Документы загружает менеджер");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await uploadFile(buffer, file.name, file.type, "portal");

  const record = await prisma.portalFile.create({
    data: {
      filename: key,
      originalName: file.name,
      size: file.size,
      mimeType: file.type || null,
      kind,
      portalRequestId: id,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(record, { status: 201 });
});
