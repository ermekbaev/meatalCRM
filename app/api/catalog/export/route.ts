import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MATERIAL_LABELS: Record<string, string> = {
  "hot-rolled":  "Г/К сталь (горячекатаная)",
  "cold-rolled": "Х/К сталь (холоднокатаная)",
  "galvanized":  "Оцинкованная сталь",
  "stainless":   "Нержавейка",
  "aluminum":    "Алюминий",
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [cuttingRaw, bendingRaw, metalsRaw] = await Promise.all([
    prisma.cuttingCatalogEntry.findMany({
      orderBy: [{ materialId: "asc" }, { thickness: "asc" }, { minLength: "asc" }],
    }),
    prisma.bendingCatalogEntry.findMany({
      orderBy: [{ materialId: "asc" }, { thickness: "asc" }],
    }),
    prisma.metalCatalogEntry.findMany({
      orderBy: [{ materialId: "asc" }, { thickness: "asc" }, { width: "asc" }],
    }),
  ]);

  // Group cutting entries by materialId + thickness
  const cuttingMap = new Map<string, any>();
  for (const entry of cuttingRaw) {
    const key = `${entry.materialId}|${entry.thickness}`;
    if (!cuttingMap.has(key)) {
      cuttingMap.set(key, {
        materialId: MATERIAL_LABELS[entry.materialId] ?? entry.materialId,
        thickness: entry.thickness,
        ranges: [],
      });
    }
    cuttingMap.get(key).ranges.push({
      minLength: entry.minLength,
      maxLength: entry.maxLength ?? null,
      pricePerMeter: entry.pricePerMeter,
    });
  }

  const cutting = Array.from(cuttingMap.values());

  const bending = bendingRaw.map((e) => ({
    materialId: MATERIAL_LABELS[e.materialId] ?? e.materialId,
    thickness: e.thickness,
    price: e.price,
  }));

  const metals = metalsRaw.map((e) => ({
    materialId: MATERIAL_LABELS[e.materialId] ?? e.materialId,
    thickness: e.thickness,
    width: e.width,
    length: e.length,
    massPerSqM: e.massPerSqM,
    sheetMass: e.sheetMass,
  }));

  const payload = { cutting, bending, metals };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="catalog-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
