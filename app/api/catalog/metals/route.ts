import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { metalEntrySchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const items = await prisma.metalCatalogEntry.findMany({
    orderBy: [{ materialId: "asc" }, { thickness: "asc" }, { width: "asc" }],
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN") throw forbidden();

  const { materialId, thickness, width, length, massPerSqM, sheetMass } =
    await parseBody(req, metalEntrySchema);
  const item = await prisma.metalCatalogEntry.upsert({
    where: { materialId_thickness_width_length: { materialId, thickness, width, length } },
    update: { massPerSqM, sheetMass },
    create: { materialId, thickness, width, length, massPerSqM, sheetMass },
  });
  return NextResponse.json(item, { status: 201 });
});
