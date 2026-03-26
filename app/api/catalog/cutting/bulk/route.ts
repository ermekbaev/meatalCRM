import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/catalog/cutting/bulk
// Body: { materialId, thickness, ranges: [{minLength, maxLength|null, pricePerMeter}] }
// Replaces all entries for the given materialId+thickness combination.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { materialId, thickness, ranges } = await req.json();

  if (!materialId || thickness == null || !Array.isArray(ranges)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Delete existing entries for this material+thickness
  await prisma.cuttingCatalogEntry.deleteMany({
    where: { materialId, thickness: parseFloat(thickness) },
  });

  // Create new entries
  if (ranges.length > 0) {
    await prisma.cuttingCatalogEntry.createMany({
      data: ranges.map((r: any) => ({
        materialId,
        thickness: parseFloat(thickness),
        minLength: parseFloat(r.minLength) || 0,
        maxLength: r.maxLength !== "" && r.maxLength != null ? parseFloat(r.maxLength) : null,
        pricePerMeter: parseFloat(r.pricePerMeter) || 0,
      })),
    });
  }

  const updated = await prisma.cuttingCatalogEntry.findMany({
    where: { materialId, thickness: parseFloat(thickness) },
    orderBy: { minLength: "asc" },
  });
  return NextResponse.json(updated);
}
