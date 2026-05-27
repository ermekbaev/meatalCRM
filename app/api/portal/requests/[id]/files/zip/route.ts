import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { createRequire } from "module";
import type ArchiverNS from "archiver";
import { z } from "zod";

// archiver — CJS-пакет, Turbopack не разрешает default-импорт. Подгружаем
// через createRequire, типы берём из @types/archiver.
const archiver = createRequire(import.meta.url)("archiver") as typeof ArchiverNS;
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFileStream } from "@/lib/storage";
import { getPortalRequestAccess } from "@/lib/acl";
import { withErrorHandling, unauthorized, notFound, badRequest, parseBody } from "@/lib/api-handler";

export const runtime = "nodejs";

const schema = z.object({
  ids: z.array(z.string()).optional(),
  kind: z.enum(["DRAWING", "DOCUMENT"]).optional(),
});

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const { ids, kind } = await parseBody(req, schema);

  const files = await prisma.portalFile.findMany({
    where: {
      portalRequestId: id,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      ...(kind ? { kind } : {}),
    },
    select: { id: true, filename: true, originalName: true },
  });

  if (files.length === 0) throw badRequest("Файлы не найдены");

  // Готовим archiver и оборачиваем его Node-стрим в web-стрим для NextResponse.
  const archive = archiver("zip", { zlib: { level: 0 } }); // 0 = store, без сжатия (большинство dxf/rar уже сжаты)
  archive.on("warning", (err) => console.warn("[zip warning]", err));
  archive.on("error", (err) => console.error("[zip error]", err));

  // Имена в архиве не должны дублироваться — допишем (1), (2) при коллизии.
  const usedNames = new Map<string, number>();
  const uniqueName = (name: string) => {
    const seen = usedNames.get(name) ?? 0;
    usedNames.set(name, seen + 1);
    if (seen === 0) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0
      ? `${name.slice(0, dot)} (${seen})${name.slice(dot)}`
      : `${name} (${seen})`;
  };

  // Подкачиваем файлы из S3 параллельно с архивированием (не ждём весь набор).
  (async () => {
    try {
      for (const f of files) {
        const { body } = await getFileStream(f.filename);
        archive.append(Readable.fromWeb(body as never), { name: uniqueName(f.originalName) });
      }
      await archive.finalize();
    } catch (err) {
      console.error("[zip pipeline]", err);
      archive.destroy(err as Error);
    }
  })();

  const webStream = Readable.toWeb(archive) as unknown as ReadableStream;

  const filename = `request-${id.slice(0, 8)}-files.zip`;
  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
});
