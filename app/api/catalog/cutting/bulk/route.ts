import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden } from "@/lib/api-handler";
import { cuttingBulkSchema } from "@/lib/validation";

// POST /api/catalog/cutting/bulk
// Body: { materialId, thickness, ranges: [{minLength, maxLength|null, pricePerMeter}] }
// Replaces all entries for the given materialId+thickness combination.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  if (session.user.role !== "ADMIN") throw forbidden();

  const { materialId, thickness, ranges } = await parseBody(req, cuttingBulkSchema);

  // Delete existing entries for this material+thickness
  await prisma.cuttingCatalogEntry.deleteMany({
    where: { materialId, thickness },
  });

  // Create new entries
  if (ranges.length > 0) {
    await prisma.cuttingCatalogEntry.createMany({
      data: ranges.map((r) => ({
        materialId,
        thickness,
        minLength: r.minLength,
        maxLength: r.maxLength ?? null,
        pricePerMeter: r.pricePerMeter,
      })),
    });
  }

  const updated = await prisma.cuttingCatalogEntry.findMany({
    where: { materialId, thickness },
    orderBy: { minLength: "asc" },
  });
  return NextResponse.json(updated);
});
