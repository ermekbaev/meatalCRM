import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { withErrorHandling, unauthorized, notFound } from "@/lib/api-handler";

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { fileId } = await params;

  const file = await prisma.requestFile.findUnique({ where: { id: fileId } });
  if (!file) throw notFound();

  await deleteFile(file.filename);
  await prisma.requestFile.delete({ where: { id: fileId } });
  return NextResponse.json({ ok: true });
});
