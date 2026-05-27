import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildObjectKey, getUploadUrl } from "@/lib/storage";
import { withErrorHandling, unauthorized, parseBody } from "@/lib/api-handler";

const MAX_SIZE = 1024 * 1024 * 1024; // 1 ГБ

const schema = z.object({
  name: z.string().min(1),
  type: z.string().default("application/octet-stream"),
  size: z.number().int().nonnegative().max(MAX_SIZE, "Файл слишком большой (макс. 1 ГБ)"),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { name, type } = await parseBody(req, schema);

  const key = buildObjectKey("requests", name);
  const uploadUrl = await getUploadUrl(key, type);

  return NextResponse.json({ key, uploadUrl });
});
