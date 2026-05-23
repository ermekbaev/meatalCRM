import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, forbidden, notFound } from "@/lib/api-handler";

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role === "CONTRACTOR") throw forbidden();

  const { fileId } = await params;

  const file = await prisma.taskFile.findUnique({ where: { id: fileId } });
  if (!file) throw notFound();

  await deleteFile(file.filename);
  await prisma.taskFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
});
