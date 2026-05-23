import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDownloadUrl, getFileStream } from "@/lib/storage";
import { canAccessFileKey, type Role } from "@/lib/acl";
import { withErrorHandling, unauthorized, forbidden, badRequest } from "@/lib/api-handler";

/**
 * GET /api/files?key=requests/abc.pdf              ← скачать файл (redirect на presigned)
 * GET /api/files?key=company/uuid.png&view=1       ← показать изображение (proxy, без CORS-проблем)
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { searchParams } = req.nextUrl;
  const key = searchParams.get("key");
  const originalName = searchParams.get("name") ?? undefined;
  const view = searchParams.get("view") === "1";

  if (!key) throw badRequest("key is required");

  // Защита от IDOR/path traversal: проверяем формат ключа и права на файл.
  const role = session.user.role as Role;
  const userId = session.user.id as string;
  if (!(await canAccessFileKey(key, role, userId))) throw forbidden();

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
});
