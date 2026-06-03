import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden, notFound } from "@/lib/api-handler";

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const role = session.user.role;
  // Подрядчик и оператор не могут удалять файлы заявок
  if (role === "CONTRACTOR" || role === "EMPLOYEE") throw forbidden();

  const { id, fileId } = await params;

  // Проверяем что fileId принадлежит именно этой заявке (защита от IDOR)
  const file = await prisma.requestFile.findFirst({ where: { id: fileId, requestId: id } });
  if (!file) throw notFound();

  // FOREMAN/ENGINEER могут удалять только файлы заявок, где они ответственные
  if (role === "FOREMAN" || role === "ENGINEER") {
    const request = await prisma.request.findFirst({
      where: { id, assigneeId: session.user.id },
      select: { id: true },
    });
    if (!request) throw forbidden();
  }

  await deleteFile(file.filename);
  await prisma.requestFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
});
