import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Map label → internal code (accepts both)
const MATERIAL_CODE: Record<string, string> = {
  // Internal codes (passthrough)
  "hot-rolled":  "hot-rolled",
  "cold-rolled": "cold-rolled",
  "galvanized":  "galvanized",
  "stainless":   "stainless",
  "aluminum":    "aluminum",
  // Russian display labels
  "Г/К сталь (горячекатаная)": "hot-rolled",
  "Х/К сталь (холоднокатаная)": "cold-rolled",
  "Оцинкованная сталь": "galvanized",
  "Нержавейка": "stainless",
  "Алюминий": "aluminum",
};

function resolveCode(materialId: string): string | null {
  return MATERIAL_CODE[materialId] ?? null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { cutting, bending, metals } = body;
  const errors: string[] = [];
  let cuttingCount = 0;
  let bendingCount = 0;
  let metalsCount = 0;

  // ── CUTTING ──────────────────────────────────────────────────────────────
  if (Array.isArray(cutting)) {
    for (const entry of cutting) {
      const code = resolveCode(entry.materialId);
      if (!code) {
        errors.push(`cutting: unknown materialId "${entry.materialId}"`);
        continue;
      }
      const thickness = parseFloat(entry.thickness);
      if (isNaN(thickness)) {
        errors.push(`cutting: invalid thickness for ${entry.materialId}`);
        continue;
      }
      if (!Array.isArray(entry.ranges) || entry.ranges.length === 0) {
        errors.push(`cutting: no ranges for ${entry.materialId} ${thickness}mm`);
        continue;
      }

      // Replace all ranges for this material+thickness
      await prisma.cuttingCatalogEntry.deleteMany({
        where: { materialId: code, thickness },
      });
      await prisma.cuttingCatalogEntry.createMany({
        data: entry.ranges.map((r: any) => ({
          materialId: code,
          thickness,
          minLength: parseFloat(r.minLength) || 0,
          maxLength: r.maxLength != null && r.maxLength !== "" ? parseFloat(r.maxLength) : null,
          pricePerMeter: parseFloat(r.pricePerMeter) || 0,
        })),
      });
      cuttingCount += entry.ranges.length;
    }
  }

  // ── BENDING ───────────────────────────────────────────────────────────────
  if (Array.isArray(bending)) {
    for (const entry of bending) {
      const code = resolveCode(entry.materialId);
      if (!code) {
        errors.push(`bending: unknown materialId "${entry.materialId}"`);
        continue;
      }
      const thickness = parseFloat(entry.thickness);
      const price = parseFloat(entry.price);
      if (isNaN(thickness) || isNaN(price)) {
        errors.push(`bending: invalid thickness or price for ${entry.materialId}`);
        continue;
      }

      await prisma.bendingCatalogEntry.upsert({
        where: { materialId_thickness: { materialId: code, thickness } },
        update: { price },
        create: { materialId: code, thickness, price },
      });
      bendingCount++;
    }
  }

  // ── METALS ────────────────────────────────────────────────────────────────
  if (Array.isArray(metals)) {
    for (const entry of metals) {
      const code = resolveCode(entry.materialId);
      if (!code) {
        errors.push(`metals: unknown materialId "${entry.materialId}"`);
        continue;
      }
      const thickness = parseFloat(entry.thickness);
      const width = parseInt(entry.width, 10);
      const length = parseInt(entry.length, 10);
      const massPerSqM = parseFloat(entry.massPerSqM);
      const sheetMass = parseFloat(entry.sheetMass);

      if (isNaN(thickness) || isNaN(width) || isNaN(length) || isNaN(massPerSqM) || isNaN(sheetMass)) {
        errors.push(`metals: invalid fields for ${entry.materialId} ${entry.thickness}mm`);
        continue;
      }

      await prisma.metalCatalogEntry.upsert({
        where: { materialId_thickness_width_length: { materialId: code, thickness, width, length } },
        update: { massPerSqM, sheetMass },
        create: { materialId: code, thickness, width, length, massPerSqM, sheetMass },
      });
      metalsCount++;
    }
  }

  return NextResponse.json({
    ok: true,
    imported: { cutting: cuttingCount, bending: bendingCount, metals: metalsCount },
    errors: errors.length > 0 ? errors : undefined,
  });
}
