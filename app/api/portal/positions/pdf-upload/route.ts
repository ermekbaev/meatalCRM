import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden, badRequest } from "@/lib/api-handler";
import { getPortalScope } from "@/lib/acl";

const MAX_SIZE = 20 * 1024 * 1024; // 20 МБ

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const companyId = getPortalScope(session);
  if (!companyId) throw forbidden();

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) throw badRequest("Файл не найден");
  if (file.size > MAX_SIZE) throw badRequest("Файл слишком большой (макс. 20 МБ)");

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "pdf") throw badRequest("Допускаются только PDF-файлы");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key } = await uploadFile(buffer, file.name, "application/pdf", "positions");

  return NextResponse.json({ key, name: file.name });
});
