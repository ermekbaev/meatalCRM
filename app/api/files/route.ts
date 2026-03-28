import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDownloadUrl, getViewUrl } from "@/lib/storage";

/**
 * GET /api/files?key=requests/abc.pdf
 * GET /api/files?key=requests/abc.pdf&view=1   ← для изображений (inline)
 *
 * Генерирует presigned URL и редиректит на него.
 * Требует авторизации, чтобы исключить утечку файлов.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const key = searchParams.get("key");
  const originalName = searchParams.get("name") ?? undefined;
  const view = searchParams.get("view") === "1";

  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  const url = view
    ? await getViewUrl(key)
    : await getDownloadUrl(key, originalName);

  return NextResponse.redirect(url);
}
