import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { z } from "zod";
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

  // archiver v8 — чистый ESM с ZipArchive. @types/archiver устарел (ещё v5 API),
  // используем any-cast чтобы не тянуть кастомные d.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { ZipArchive } = (await import("archiver")) as any;
  const archive: Readable & {
    append(src: NodeJS.ReadableStream, opts: { name: string }): void;
    finalize(): Promise<void>;
    destroy(err?: Error): void;
  } = new ZipArchive({ zlib: { level: 0 } }); // level: 0 = store, .rar/.dxf уже сжаты

  archive.on("warning", (err: Error) => console.warn("[zip warning]", err));
  archive.on("error", (err: Error) => console.error("[zip error]", err));

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

  (async () => {
    try {
      for (const f of files) {
        const { body } = await getFileStream(f.filename);
        archive.append(Readable.fromWeb(body as never), { name: uniqueName(f.originalName) });
      }
      await archive.finalize();
    } catch (err) {
      console.error("[zip pipeline]", err);
      archive.destroy(err instanceof Error ? err : new Error(String(err)));
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
