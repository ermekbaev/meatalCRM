import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { bendingEntrySchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const items = await prisma.bendingCatalogEntry.findMany({
    orderBy: [{ materialId: "asc" }, { thickness: "asc" }],
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN") throw forbidden();

  const data = await parseBody(req, bendingEntrySchema);
  const item = await prisma.bendingCatalogEntry.create({ data });
  return NextResponse.json(item, { status: 201 });
});
