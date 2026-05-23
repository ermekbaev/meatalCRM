import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { cuttingEntrySchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const items = await prisma.cuttingCatalogEntry.findMany({
    orderBy: [{ materialId: "asc" }, { thickness: "asc" }, { minLength: "asc" }],
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN") throw forbidden();

  const data = await parseBody(req, cuttingEntrySchema);
  const item = await prisma.cuttingCatalogEntry.create({
    data: { ...data, maxLength: data.maxLength ?? null },
  });
  return NextResponse.json(item, { status: 201 });
});
