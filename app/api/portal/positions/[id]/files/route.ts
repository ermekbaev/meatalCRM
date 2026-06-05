import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden, notFound, badRequest } from "@/lib/api-handler";
import { getPortalScope } from "@/lib/acl";

const MAX_SIZE = 50 * 1024 * 1024; // 50 МБ
const ALLOWED_EXT = ["pdf", "dxf"];
const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  dxf: "application/dxf",
};

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const { id } = await params;
  const position = await prisma.clientPosition.findFirst({
    where: { id, companyId },
    select: { id: true },
  });
  if (!position) throw notFound();

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) throw badRequest("Файл не найден");
  if (file.size > MAX_SIZE) throw badRequest("Файл слишком большой (макс. 50 МБ)");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) throw badRequest("Допускаются только PDF и DXF файлы");

  const kind = ext.toUpperCase();
  const mimeType = MIME_MAP[ext] ?? "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await uploadFile(buffer, file.name, mimeType, "positions");

  const created = await prisma.clientPositionFile.create({
    data: {
      positionId: id,
      filename: key,
      originalName: file.name,
      size: file.size,
      kind,
    },
    select: { id: true, filename: true, originalName: true, size: true, kind: true, createdAt: true },
  });

  return NextResponse.json(created, { status: 201 });
});
