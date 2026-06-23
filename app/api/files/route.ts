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

// Тип по расширению — фолбэк, когда в S3 ContentType потерян (octet-stream).
function contentTypeByExt(key: string): string | undefined {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "svg": return "image/svg+xml";
    default: return undefined;
  }
}
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
    // Проксируем содержимое через сервер — браузер не видит S3-URL, CORS не нужен.
    const { body, contentType } = await getFileStream(key);
    // Фолбэк: если в S3 тип не проставлен (octet-stream), браузер форсит скачивание
    // вместо inline-показа. Для предпросмотра выводим тип по расширению ключа.
    const resolvedType =
      contentType && contentType !== "application/octet-stream"
        ? contentType
        : contentTypeByExt(key) ?? contentType;
    return new NextResponse(body as any, {
      headers: {
        "Content-Type": resolvedType,
        // inline — чтобы PDF/картинка открывались в iframe/img, а не скачивались
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const url = await getDownloadUrl(key, originalName);
  return NextResponse.redirect(url);
});
