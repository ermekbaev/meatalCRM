import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { getPortalRequestAccess } from "@/lib/acl";
import { withErrorHandling, unauthorized, notFound, badRequest, parseBody } from "@/lib/api-handler";

const schema = z.object({
  ids: z.array(z.string()).min(1, "Не выбрано ни одного файла"),
});

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  const { ids } = await parseBody(req, schema);

  const files = await prisma.portalFile.findMany({
    where: {
      id: { in: ids },
      portalRequestId: id,
      // CLIENT удаляет только свои файлы (своя загрузка). У ADMIN/MANAGER ограничения нет.
      ...(session.user.role === "CLIENT" ? { uploadedById: session.user.id } : {}),
    },
    select: { id: true, filename: true },
  });

  if (files.length === 0) throw badRequest("Нет доступных к удалению файлов");

  // Сначала чистим S3, потом БД — если S3 упадёт, в БД ничего не сломаем.
  await Promise.all(files.map((f) => deleteFile(f.filename)));
  const deleted = await prisma.portalFile.deleteMany({
    where: { id: { in: files.map((f) => f.id) } },
  });

  return NextResponse.json({ deleted: deleted.count });
});
