import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { cuttingEntryUpdateSchema } from "@/lib/validation";

export const PUT = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN") throw forbidden();

  const { id } = await params;
  const data = await parseBody(req, cuttingEntryUpdateSchema);
  const item = await prisma.cuttingCatalogEntry.update({ where: { id }, data });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN") throw forbidden();

  const { id } = await params;
  await prisma.cuttingCatalogEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
