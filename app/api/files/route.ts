import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDownloadUrl, getFileStream } from "@/lib/storage";

/**
 * GET /api/files?key=requests/abc.pdf              ← скачать файл (redirect на presigned)
 * GET /api/files?key=company/uuid.png&view=1       ← показать изображение (proxy, без CORS-проблем)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const key = searchParams.get("key");
  const originalName = searchParams.get("name") ?? undefined;
  const view = searchParams.get("view") === "1";

  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  if (view) {
    // Проксируем содержимое через сервер — браузер не видит S3-URL, CORS не нужен
    const { body, contentType } = await getFileStream(key);
    return new NextResponse(body as any, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const url = await getDownloadUrl(key, originalName);
  return NextResponse.redirect(url);
}
